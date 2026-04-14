// ussd/src/menus/loans.js
// Loans menu
//
// Flow:
//   1. Check Eligibility → END (shows tier + max amount)
//   2. Apply for Loan    → amount → purpose → PIN → result
//   3. My Loans          → shows active loan status
//   4. Repay             → active loan → amount → confirm
//   0. Back

const { updateSession, getSession } = require('../services/sessionManager');
const api = require('../services/apiClient');
const { con, end } = require('./index');

function fmt(num) {
    return parseFloat(num || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Loan purpose options (USSD-friendly short labels)
const PURPOSES = [
    { key: '1', label: 'Stock/Inventory',  value: 'stock' },
    { key: '2', label: 'School fees',      value: 'school_fees' },
    { key: '3', label: 'Medical',          value: 'medical' },
    { key: '4', label: 'Transport',        value: 'transport' },
    { key: '5', label: 'General',          value: 'general' },
];

async function handle(sessionId, session, inputs) {
    if (inputs.length === 0) {
        return con(
            'Loans\n' +
            '\n' +
            '1. Check Eligibility\n' +
            '2. Apply for Loan\n' +
            '3. My Loans\n' +
            '4. Repay Loan\n' +
            '0. Back'
        );
    }

    const choice = inputs[0];

    // ── 1. CHECK ELIGIBILITY ─────────────────────────────────
    if (choice === '1') {
        try {
            const data = await api.getLoanEligibility(session.token);

            if (!data.eligible) {
                const reason = data.reason || 'Score too low.';
                // Shorten reason for USSD
                const shortReason = reason.length > 60
                    ? reason.substring(0, 57) + '...'
                    : reason;
                return end(
                    'Loan Eligibility:\n' +
                    `Score: ${data.score}/100\n` +
                    '\n' +
                    `Not eligible:\n${shortReason}`
                );
            }

            const storeNote = data.requires_store
                ? 'Requires store visit.'
                : 'Instant disbursement!';

            return end(
                'You are eligible!\n' +
                '\n' +
                `Score: ${data.score} (${data.score_label})\n` +
                `Max: US$${data.max_loan_usd}\n` +
                `Rate: ${data.interest_rate_pct} flat\n` +
                `Term: ${data.term_days} days\n` +
                '\n' +
                storeNote
            );
        } catch (err) {
            return end(`Error: ${api.getErrorMessage(err)}`);
        }
    }

    // ── 2. APPLY FOR LOAN ────────────────────────────────────
    if (choice === '2') {
        // Step 1: Check eligibility first
        if (inputs.length === 1) {
            try {
                const elig = await api.getLoanEligibility(session.token);
                if (!elig.eligible) {
                    return end(
                        'Not eligible for a loan.\n' +
                        '\n' +
                        `Score: ${elig.score}/100\n` +
                        `Reason: ${(elig.reason || '').substring(0, 50)}`
                    );
                }
                await updateSession(sessionId, {
                    data: { maxLoan: elig.max_loan_usd, eligData: elig }
                });
                return con(
                    `Max loan: US$${elig.max_loan_usd}\n` +
                    `Rate: ${elig.interest_rate_pct}\n` +
                    `Term: ${elig.term_days} days\n` +
                    '\n' +
                    'Enter amount in USD:\n' +
                    `(Max: $${elig.max_loan_usd})`
                );
            } catch (err) {
                return end(`Error: ${api.getErrorMessage(err)}`);
            }
        }

        // Step 2: Amount entered — show purpose menu
        if (inputs.length === 2) {
            const amount = parseFloat(inputs[1]);
            const currentSession = await getSession(sessionId);
            const maxLoan = currentSession?.data?.maxLoan || 500;

            if (isNaN(amount) || amount <= 0) {
                return con('Invalid amount.\nEnter USD amount:\n(e.g. 20)');
            }
            if (amount > maxLoan) {
                return con(
                    `Amount too high.\n` +
                    `Maximum: US$${maxLoan}\n` +
                    '\n' +
                    'Enter amount in USD:'
                );
            }

            await updateSession(sessionId, {
                data: { ...(currentSession?.data || {}), loanAmount: amount }
            });

            let menu = 'Loan purpose:\n\n';
            PURPOSES.forEach(p => { menu += `${p.key}. ${p.label}\n`; });
            return con(menu);
        }

        // Step 3: Purpose selected — ask for PIN
        if (inputs.length === 3) {
            const purposeIdx = PURPOSES.find(p => p.key === inputs[2]);
            if (!purposeIdx) {
                let menu = 'Invalid. Select purpose:\n\n';
                PURPOSES.forEach(p => { menu += `${p.key}. ${p.label}\n`; });
                return con(menu);
            }

            const currentSession = await getSession(sessionId);
            await updateSession(sessionId, {
                data: { ...(currentSession?.data || {}), loanPurpose: purposeIdx.value }
            });

            const amt = currentSession?.data?.loanAmount || '?';
            return con(
                `Loan: US$${amt}\n` +
                `Purpose: ${purposeIdx.label}\n` +
                '\n' +
                'Enter your PIN to confirm:'
            );
        }

        // Step 4: PIN entered — submit application
        if (inputs.length === 4) {
            const pin = inputs[3];
            const currentSession = await getSession(sessionId);
            const { loanAmount, loanPurpose } = currentSession?.data || {};

            if (!/^\d{4}$/.test(pin)) {
                return con('Invalid PIN.\nEnter 4-digit PIN:');
            }

            try {
                const result = await api.applyForLoan(
                    session.token,
                    loanAmount,
                    loanPurpose,
                    pin
                );

                // Clear loan data from session
                await updateSession(sessionId, { data: {} });

                if (result.flow === 'instant') {
                    const loan = result.loan;
                    return end(
                        'LOAN APPROVED!\n' +
                        '\n' +
                        `ZiG ${fmt(loan.amount_zig)} added\n` +
                        `to your wallet.\n` +
                        '\n' +
                        `Repay by: ${loan.due_date}\n` +
                        `Total due: ZiG ${fmt(loan.total_repayment_zig)}`
                    );
                } else {
                    // Store visit required
                    const code = result.verification_code;
                    return end(
                        'Application submitted!\n' +
                        '\n' +
                        `Your code:\n${code}\n` +
                        '\n' +
                        'Visit a BATANA store\n' +
                        'with your National ID\n' +
                        `Expires: ${result.code_expires}`
                    );
                }
            } catch (err) {
                const msg = api.getErrorMessage(err);
                // Specific PIN error handling
                if (msg.includes('Incorrect PIN')) {
                    return con(
                        'Incorrect PIN.\n' +
                        'Try again:\n' +
                        '\n' +
                        'Enter your 4-digit PIN:'
                    );
                }
                return end(`Application failed:\n${msg.substring(0, 80)}`);
            }
        }
    }

    // ── 3. MY LOANS ──────────────────────────────────────────
    if (choice === '3') {
        try {
            const data = await api.getMyLoans(session.token);
            const active = data.active_loan;

            if (!active) {
                const total = data.total_loans || 0;
                const done = data.completed_loans || 0;
                return end(
                    'No active loans.\n' +
                    '\n' +
                    `Total loans: ${total}\n` +
                    `Completed: ${done}\n` +
                    '\n' +
                    'Apply for a loan to\n' +
                    'grow your business.'
                );
            }

            const statusMap = {
                disbursed: 'Active',
                active: 'Active',
                pending_store: 'Awaiting store visit',
                pending_admin: 'Under review'
            };

            const status = statusMap[active.status] || active.status;
            const overdueNote = active.is_overdue ? '\nOVERDUE - Pay now!' : '';

            return end(
                'Active Loan:\n' +
                '\n' +
                `Amount: ZiG ${fmt(active.amount_zig)}\n` +
                `Remaining: ZiG ${fmt(active.remaining_zig)}\n` +
                `Due: ${active.due_date}\n` +
                `Status: ${status}\n` +
                `Progress: ${active.progress_pct}%` +
                overdueNote +
                (active.verification_code
                    ? `\n\nStore code:\n${active.verification_code}`
                    : '')
            );
        } catch (err) {
            return end(`Error: ${api.getErrorMessage(err)}`);
        }
    }

    // ── 4. REPAY LOAN ────────────────────────────────────────
    if (choice === '4') {
        // Step 1: Check active loan
        if (inputs.length === 1) {
            try {
                const data = await api.getMyLoans(session.token);
                const active = data.active_loan;

                if (!active || !['disbursed', 'active'].includes(active.status)) {
                    return end(
                        'No repayable loan found.\n' +
                        '\n' +
                        'You need an active\n' +
                        'disbursed loan to repay.'
                    );
                }

                await updateSession(sessionId, {
                    data: { loanId: active.id, remainingZig: active.remaining_zig }
                });

                return con(
                    'Repay Loan:\n' +
                    '\n' +
                    `Remaining: ZiG ${fmt(active.remaining_zig)}\n` +
                    `Due: ${active.due_date}\n` +
                    '\n' +
                    'Enter ZiG amount\n' +
                    'to repay:'
                );
            } catch (err) {
                return end(`Error: ${api.getErrorMessage(err)}`);
            }
        }

        // Step 2: Amount entered — confirm
        if (inputs.length === 2) {
            const amount = parseFloat(inputs[1]);
            const currentSession = await getSession(sessionId);
            const remaining = currentSession?.data?.remainingZig || 0;

            if (isNaN(amount) || amount <= 0) {
                return con('Invalid amount.\n\nEnter ZiG amount:');
            }

            const actualAmount = Math.min(amount, remaining);
            const fullRepay = actualAmount >= remaining;

            return con(
                'Confirm Repayment:\n' +
                '\n' +
                `ZiG ${fmt(actualAmount)}\n` +
                (fullRepay ? '(Full repayment)\n' : '') +
                '\n' +
                '1. Confirm\n' +
                '2. Cancel'
            );
        }

        // Step 3: Process repayment
        if (inputs.length === 3) {
            if (inputs[2] === '1') {
                const currentSession = await getSession(sessionId);
                const { loanId, remainingZig } = currentSession?.data || {};
                const amount = parseFloat(inputs[1]);
                const actualAmount = Math.min(amount, remainingZig || amount);

                try {
                    const result = await api.repayLoan(
                        session.token,
                        loanId,
                        actualAmount
                    );

                    await updateSession(sessionId, { data: {} });

                    const r = result.repayment;
                    return end(
                        r.fully_repaid
                            ? 'Loan fully repaid!\n\n' +
                              'Your Vimbiso Score\n' +
                              'will improve. Well done!'
                            : 'Repayment received!\n' +
                              '\n' +
                              `Paid: ZiG ${fmt(r.paid_zig)}\n` +
                              `Remaining: ZiG ${fmt(r.remaining_zig)}\n` +
                              `Progress: ${r.progress_pct}%`
                    );
                } catch (err) {
                    return end(`Repayment failed:\n${api.getErrorMessage(err)}`);
                }
            } else {
                return end('Repayment cancelled.');
            }
        }
    }

    // ── 0. BACK ──────────────────────────────────────────────
    if (choice === '0') {
        await updateSession(sessionId, { menu: 'main', step: 0, data: {} });
        const mainMenu = require('./main');
        return mainMenu.handle(sessionId, session, []);
    }

    return con(
        'Invalid option.\n\n' +
        'Loans:\n' +
        '1. Check Eligibility\n' +
        '2. Apply for Loan\n' +
        '3. My Loans\n' +
        '4. Repay Loan\n' +
        '0. Back'
    );
}

module.exports = { handle };