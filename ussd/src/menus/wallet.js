// ussd/src/menus/wallet.js
// Wallet menu — balance check and money transfer
//
// Flow:
//   Main → 1 → Wallet menu
//     1. Check Balance  → END (shows ZiG + gold + USD)
//     2. Send Money     → phone → amount → currency → confirm → END
//     0. Back           → Main menu

const { updateSession } = require('../services/sessionManager');
const api = require('../services/apiClient');
const { con, end } = require('./index');

// Format numbers with commas
function fmt(num) {
    return parseFloat(num || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function fmtGold(num) {
    return parseFloat(num || 0).toFixed(4);
}

async function handle(sessionId, session, inputs) {
    // inputs[0] = wallet sub-menu choice
    // inputs[1..] = further steps (phone, amount, currency)

    // ── Wallet sub-menu ──────────────────────────────────────
    if (inputs.length === 0) {
        return con(
            'My Wallet\n' +
            '\n' +
            '1. Check Balance\n' +
            '2. Send Money\n' +
            '0. Back'
        );
    }

    const choice = inputs[0];

    // ── 1. CHECK BALANCE ─────────────────────────────────────
    if (choice === '1') {
        try {
            const data = await api.getWallet(session.token);
            const w = data.wallet;
            const goldUsd = parseFloat(w.gold_value_usd || 0).toFixed(2);

            return end(
                'Your BATANA Wallet:\n' +
                '\n' +
                `ZiG:  ${fmt(w.zig_balance)}\n` +
                `USD:  $${fmt(w.usd_balance)}\n` +
                `Gold: ${fmtGold(w.gold_grams)}g\n` +
                `      (~$${goldUsd})\n` +
                '\n' +
                'Gold protects your savings.'
            );
        } catch (err) {
            return end(`Error: ${api.getErrorMessage(err)}`);
        }
    }

    // ── 2. SEND MONEY ────────────────────────────────────────
    if (choice === '2') {
        // Step 1: Enter recipient phone
        if (inputs.length === 1) {
            return con(
                'Send Money\n' +
                '\n' +
                'Enter recipient phone:\n' +
                '(e.g. 0771234567)'
            );
        }

        const toPhone = inputs[1];

        // Validate phone format
        const cleanPhone = toPhone.replace(/[\s-]/g, '');
        const validPhone = /^(0|(\+?263))7[0-9]{8}$/.test(cleanPhone);
        if (!validPhone) {
            return con(
                'Invalid phone number.\n' +
                'Use format: 07XXXXXXXX\n' +
                '\n' +
                'Enter recipient phone:'
            );
        }

        // Step 2: Enter amount
        if (inputs.length === 2) {
            return con(
                `Send to: ${toPhone}\n` +
                '\n' +
                'Enter amount in ZiG:\n' +
                '(e.g. 500)'
            );
        }

        const amount = parseFloat(inputs[2]);
        if (isNaN(amount) || amount <= 0) {
            return con(
                'Invalid amount.\n' +
                'Enter a positive number:\n' +
                '(e.g. 500)'
            );
        }

        // Step 3: Confirm
        if (inputs.length === 3) {
            // Calculate fee preview
            let fee = 0;
            if (amount > 100) fee = amount * 0.005;
            else if (amount > 20) fee = 0.50;

            const total = amount + fee;
            const feeMsg = fee > 0
                ? `Fee: ZiG ${fmt(fee)}\nTotal: ZiG ${fmt(total)}`
                : 'Fee: Free';

            return con(
                'Confirm Transfer:\n' +
                '\n' +
                `To:     ${toPhone}\n` +
                `Amount: ZiG ${fmt(amount)}\n` +
                `${feeMsg}\n` +
                '\n' +
                '1. Confirm\n' +
                '2. Cancel'
            );
        }

        // Step 4: Process
        if (inputs.length === 4) {
            if (inputs[3] === '1') {
                try {
                    const result = await api.transfer(
                        session.token,
                        toPhone,
                        amount,
                        'ZiG',
                        'ussd_transfer'
                    );
                    const saved = result.comparison?.you_saved;
                    const savedMsg = saved > 0
                        ? `\nSaved ZiG ${fmt(saved)} vs EcoCash`
                        : '';

                    return end(
                        'Transfer Successful!\n' +
                        '\n' +
                        `Sent: ZiG ${fmt(amount)}\n` +
                        `To: ${result.transfer.receiver}\n` +
                        `Fee: ZiG ${fmt(result.transfer.fee)}` +
                        savedMsg
                    );
                } catch (err) {
                    return end(`Transfer failed:\n${api.getErrorMessage(err)}`);
                }
            } else {
                return end('Transfer cancelled.');
            }
        }
    }

    // ── 0. BACK ──────────────────────────────────────────────
    if (choice === '0') {
        await updateSession(sessionId, { menu: 'main', step: 0, data: {} });
        const mainMenu = require('./main');
        return mainMenu.handle(sessionId, session, []);
    }

    // Invalid
    return con(
        'Invalid option.\n' +
        '\n' +
        'My Wallet:\n' +
        '1. Check Balance\n' +
        '2. Send Money\n' +
        '0. Back'
    );
}

module.exports = { handle };