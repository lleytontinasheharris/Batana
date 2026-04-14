// ussd/src/menus/insurance.js
// Insurance menu
//
// Flow:
//   1. My Policies   → shows active cover
//   2. Get Covered   → list plans → select → confirm → enroll
//   3. Make a Claim  → select policy → select type → submit
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

// Plan display names for USSD (short)
const PLAN_LABELS = {
    nhaka_basic:   'Nhaka Basic   $2/mo $500 cover',
    nhaka_family:  'Nhaka Family  $5/mo $1000 cover',
    nhaka_premium: 'Nhaka Premium $8/mo $2000 cover',
    maruva:        'Maruva Hosp   $3/mo $10/day'
};

const PLAN_IDS = ['nhaka_basic', 'nhaka_family', 'nhaka_premium', 'maruva'];

// Pre-built claim descriptions (avoid freetext on USSD)
const CLAIM_TYPES = {
    funeral: [
        { key: '1', label: 'Death of policyholder',
          desc: 'Claiming funeral benefit for death of policyholder' },
        { key: '2', label: 'Death of spouse/child',
          desc: 'Claiming funeral benefit for death of covered family member' },
    ],
    hospital: [
        { key: '1', label: 'Hospital admission',
          desc: 'Hospital cash claim for inpatient admission' },
    ]
};

async function handle(sessionId, session, inputs) {
    if (inputs.length === 0) {
        return con(
            'Insurance\n' +
            '\n' +
            '1. My Policies\n' +
            '2. Get Covered\n' +
            '3. Make a Claim\n' +
            '0. Back'
        );
    }

    const choice = inputs[0];

    // ── 1. MY POLICIES ───────────────────────────────────────
    if (choice === '1') {
        try {
            const data = await api.getMyPolicies(session.token);
            const policies = data.policies || [];
            const active = policies.filter(p => p.status === 'active');

            if (active.length === 0) {
                return end(
                    'No active policies.\n' +
                    '\n' +
                    'Select "Get Covered"\n' +
                    'to protect yourself\n' +
                    'and your family.'
                );
            }

            // Show each active policy
            let display = `Active Policies: ${active.length}\n\n`;
            active.forEach(p => {
                const planName = p.plan_details?.name || p.plan_id;
                const cover = fmt(p.cover_amount_usd);
                const premium = fmt(p.premium_usd);
                display += `${planName}\n`;
                display += `Cover: US$${cover}\n`;
                display += `Premium: US$${premium}/mo\n\n`;
            });

            return end(display.trim());
        } catch (err) {
            return end(`Error: ${api.getErrorMessage(err)}`);
        }
    }

    // ── 2. GET COVERED ───────────────────────────────────────
    if (choice === '2') {
        // Show plan list
        if (inputs.length === 1) {
            let menu = 'Select a plan:\n\n';
            PLAN_IDS.forEach((id, i) => {
                menu += `${i + 1}. ${PLAN_LABELS[id]}\n`;
            });
            menu += '0. Back';
            return con(menu);
        }

        // Plan selected — confirm
        if (inputs.length === 2) {
            const planIdx = parseInt(inputs[1]) - 1;
            if (inputs[1] === '0') {
                return handle(sessionId, session, []);
            }
            if (isNaN(planIdx) || planIdx < 0 || planIdx >= PLAN_IDS.length) {
                return con('Invalid choice.\n\n0. Back');
            }

            const planId = PLAN_IDS[planIdx];
            await updateSession(sessionId, {
                data: { selectedPlanId: planId }
            });

            // Get live plan details for ZiG amounts
            try {
                const plansData = await api.getInsurancePlans();
                const plan = plansData.plans.find(p => p.id === planId);

                if (!plan) return end('Plan not found.');

                return con(
                    `${plan.name}\n` +
                    '\n' +
                    `Cover: US$${plan.cover_usd}\n` +
                    `       ZiG ${fmt(plan.cover_zig)}\n` +
                    `Premium: US$${plan.premium_usd}/mo\n` +
                    `         ZiG ${fmt(plan.premium_zig)}/mo\n` +
                    '\n' +
                    '1. Enroll now\n' +
                    '2. Cancel'
                );
            } catch (err) {
                return end(`Error: ${api.getErrorMessage(err)}`);
            }
        }

        // Confirm enrollment
        if (inputs.length === 3) {
            if (inputs[2] === '1') {
                const currentSession = await getSession(sessionId);
                const planId = currentSession?.data?.selectedPlanId;

                if (!planId) return end('Session expired.\nDial again.');

                try {
                    const result = await api.enrollInsurance(session.token, planId);
                    await updateSession(sessionId, { data: {} });

                    const p = result.policy;
                    return end(
                        'Enrolled!\n' +
                        '\n' +
                        `Plan: ${p.plan}\n` +
                        `Cover: US$${p.cover_usd}\n` +
                        `Premium: ZiG ${fmt(p.premium_zig)}/mo\n` +
                        `Next bill: ${p.next_billing}\n` +
                        '\n' +
                        '+5 to Vimbiso Score!'
                    );
                } catch (err) {
                    const msg = api.getErrorMessage(err);
                    if (msg.includes('already have an active')) {
                        return end(
                            'Already enrolled\n' +
                            'in this type of plan.\n' +
                            '\n' +
                            'Cancel current policy\n' +
                            'via the app to switch.'
                        );
                    }
                    if (msg.includes('Insufficient balance')) {
                        return end(
                            'Insufficient balance\n' +
                            'to pay first premium.\n' +
                            '\n' +
                            'Deposit funds first.'
                        );
                    }
                    return end(`Enrollment failed:\n${msg.substring(0, 70)}`);
                }
            } else {
                return end('Enrollment cancelled.');
            }
        }
    }

    // ── 3. MAKE A CLAIM ──────────────────────────────────────
    if (choice === '3') {
        // Get active policies
        if (inputs.length === 1) {
            try {
                const data = await api.getMyPolicies(session.token);
                const active = (data.policies || []).filter(p => p.status === 'active');

                if (active.length === 0) {
                    return end(
                        'No active policies.\n' +
                        '\n' +
                        'You need an active\n' +
                        'policy to make a claim.'
                    );
                }

                // Store active policies in session
                await updateSession(sessionId, {
                    data: { claimPolicies: active }
                });

                let menu = 'Select policy:\n\n';
                active.forEach((p, i) => {
                    const name = p.plan_details?.name || p.plan_id;
                    menu += `${i + 1}. ${name}\n`;
                });
                menu += '0. Back';
                return con(menu);
            } catch (err) {
                return end(`Error: ${api.getErrorMessage(err)}`);
            }
        }

        // Policy selected — show claim types
        if (inputs.length === 2) {
            if (inputs[1] === '0') return handle(sessionId, session, []);

            const currentSession = await getSession(sessionId);
            const policies = currentSession?.data?.claimPolicies || [];
            const policyIdx = parseInt(inputs[1]) - 1;

            if (isNaN(policyIdx) || policyIdx >= policies.length) {
                return con('Invalid selection.\n\n0. Back');
            }

            const policy = policies[policyIdx];
            const claimTypes = CLAIM_TYPES[policy.type] ||
                [{ key: '1', label: 'General claim',
                   desc: 'General insurance claim' }];

            await updateSession(sessionId, {
                data: { ...(currentSession?.data || {}), claimPolicyId: policy.id,
                        claimPolicyType: policy.type }
            });

            let menu = 'Claim type:\n\n';
            claimTypes.forEach(c => { menu += `${c.key}. ${c.label}\n`; });
            menu += '0. Back';
            return con(menu);
        }

        // Claim type selected
        if (inputs.length === 3) {
            if (inputs[2] === '0') return handle(sessionId, session, []);

            const currentSession = await getSession(sessionId);
            const { claimPolicyType } = currentSession?.data || {};
            const claimTypes = CLAIM_TYPES[claimPolicyType] ||
                [{ key: '1', label: 'General claim',
                   desc: 'General insurance claim' }];
            const claimType = claimTypes.find(c => c.key === inputs[2]);

            if (!claimType) return con('Invalid selection.\n\n0. Back');

            await updateSession(sessionId, {
                data: { ...(currentSession?.data || {}),
                        claimDescription: claimType.desc }
            });

            // For hospital claims, ask number of days
            if (claimPolicyType === 'hospital') {
                return con(
                    'Hospital Cash Claim\n' +
                    '\n' +
                    'How many days were\n' +
                    'you hospitalised?\n' +
                    '(1-30):'
                );
            }

            // For funeral — go straight to confirm
            return con(
                'Confirm Claim:\n' +
                '\n' +
                `Type: ${claimType.label}\n` +
                '\n' +
                'Our team will review\n' +
                'within 48 hours.\n' +
                '\n' +
                '1. Submit claim\n' +
                '2. Cancel'
            );
        }

        // Hospital days OR funeral confirm
        if (inputs.length === 4) {
            const currentSession = await getSession(sessionId);
            const {
                claimPolicyId,
                claimPolicyType,
                claimDescription
            } = currentSession?.data || {};

            if (claimPolicyType === 'hospital') {
                const days = parseInt(inputs[3]);
                if (isNaN(days) || days < 1 || days > 30) {
                    return con('Enter days (1-30):');
                }

                const claimAmount = days * 10;
                await updateSession(sessionId, {
                    data: { ...(currentSession?.data || {}), claimDays: days }
                });

                return con(
                    'Confirm Hospital Claim:\n' +
                    '\n' +
                    `Days: ${days}\n` +
                    `Claim: US$${claimAmount}\n` +
                    '\n' +
                    '1. Submit claim\n' +
                    '2. Cancel'
                );
            }

            // Funeral confirm (inputs[3] is 1 or 2)
            if (inputs[3] === '1') {
                try {
                    const result = await api.claimInsurance(
                        session.token,
                        claimPolicyId,
                        claimDescription,
                        null
                    );
                    await updateSession(sessionId, { data: {} });

                    return end(
                        'Claim submitted.\n' +
                        '\n' +
                        `Ref: ${result.claim.id.substring(0, 8)}\n` +
                        `Amount: ${result.claim.amount_usd}\n` +
                        '\n' +
                        'Reviewed within 48hrs.\n' +
                        'We are here with you.'
                    );
                } catch (err) {
                    return end(`Claim failed:\n${api.getErrorMessage(err)}`);
                }
            } else {
                return end('Claim cancelled.');
            }
        }

        // Hospital claim submit (inputs[4] = 1 or 2)
        if (inputs.length === 5) {
            const currentSession = await getSession(sessionId);
            const { claimPolicyId, claimDescription, claimDays } = currentSession?.data || {};

            if (inputs[4] === '1') {
                try {
                    const result = await api.claimInsurance(
                        session.token,
                        claimPolicyId,
                        claimDescription,
                        claimDays
                    );
                    await updateSession(sessionId, { data: {} });

                    return end(
                        'Hospital claim submitted!\n' +
                        '\n' +
                        `Ref: ${result.claim.id.substring(0, 8)}\n` +
                        `Amount: ${result.claim.amount_usd}\n` +
                        '\n' +
                        'Processed within 24hrs.\n' +
                        'Get well soon.'
                    );
                } catch (err) {
                    return end(`Claim failed:\n${api.getErrorMessage(err)}`);
                }
            } else {
                return end('Claim cancelled.');
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
        'Insurance:\n' +
        '1. My Policies\n' +
        '2. Get Covered\n' +
        '3. Make a Claim\n' +
        '0. Back'
    );
}

module.exports = { handle };