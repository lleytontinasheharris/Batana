// ussd/src/menus/mukando.js
// Mukando menu — view groups, contribute, check payout status
//
// Flow:
//   Main → 2 → Mukando menu
//     1. My Groups    → lists groups → select group → group detail
//     2. Contribute   → lists groups → select → confirm → contribute
//     0. Back

const { updateSession } = require('../services/sessionManager');
const api = require('../services/apiClient');
const { con, end } = require('./index');

function fmt(num) {
    return parseFloat(num || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function handle(sessionId, session, inputs) {
    if (inputs.length === 0) {
        return con(
            'Mukando\n' +
            '\n' +
            '1. My Groups\n' +
            '2. Contribute\n' +
            '0. Back'
        );
    }

    const choice = inputs[0];

    // ── 1. MY GROUPS ─────────────────────────────────────────
    if (choice === '1') {
        try {
            const data = await api.getMukandoGroups(session.phone);
            const groups = data.mukando_groups || [];

            if (groups.length === 0) {
                return end(
                    'No mukando groups yet.\n' +
                    '\n' +
                    'Join a group via the\n' +
                    'BATANA app to get started.\n' +
                    'Your contributions build\n' +
                    'your Vimbiso Score.'
                );
            }

            // Show group list
            if (inputs.length === 1) {
                let menu = 'My Groups:\n\n';
                groups.forEach((g, i) => {
                    const status = g.has_received_payout ? '(paid out)' :
                                   g.status === 'completed' ? '(done)' : 
                                   `Mth ${g.current_month}/${g.cycle_months || '?'}`;
                    menu += `${i + 1}. ${g.name}\n   ${status}\n`;
                });
                menu += '0. Back';
                return con(menu);
            }

            // User selected a group
            const groupIdx = parseInt(inputs[2]) - 1;
            if (isNaN(groupIdx) || groupIdx < 0 || groupIdx >= groups.length) {
                return con('Invalid selection.\n\n0. Back');
            }

            const group = groups[groupIdx];
            const detail = await api.getMukandoGroup(group.group_id);
            const g = detail.group;
            const pool = detail.pool;
            const contrib = detail.contribution;
            const thisMonth = detail.this_month;

            return end(
                `${g.name}\n` +
                '\n' +
                `Month: ${g.current_month}/${g.cycle_months}\n` +
                `Recipient: ${thisMonth.recipient}\n` +
                `Paid: ${thisMonth.contributions}\n` +
                '\n' +
                `Your contrib: ZiG ${fmt(contrib.zig_today)}\n` +
                `Pool: ZiG ${fmt(pool.zig)}`
            );

        } catch (err) {
            return end(`Error: ${api.getErrorMessage(err)}`);
        }
    }

    // ── 2. CONTRIBUTE ────────────────────────────────────────
    if (choice === '2') {
        try {
            const data = await api.getMukandoGroups(session.phone);
            const groups = (data.mukando_groups || []).filter(
                g => g.status === 'active' && !g.has_received_payout
            );

            if (groups.length === 0) {
                return end(
                    'No active groups to\n' +
                    'contribute to right now.\n' +
                    '\n' +
                    'Join via the BATANA app.'
                );
            }

            // List groups to contribute to
            if (inputs.length === 1) {
                let menu = 'Select group:\n\n';
                groups.forEach((g, i) => {
                    menu += `${i + 1}. ${g.name}\n`;
                });
                menu += '0. Back';
                return con(menu);
            }

            const groupIdx = parseInt(inputs[1]) - 1;
            if (isNaN(groupIdx) || groupIdx < 0 || groupIdx >= groups.length) {
                return con('Invalid selection.\n\n0. Back');
            }

            const group = groups[groupIdx];
            const detail = await api.getMukandoGroup(group.group_id);
            const contrib = detail.contribution;

            // Confirm screen
            if (inputs.length === 2) {
                return con(
                    `Contribute to:\n${group.name}\n` +
                    '\n' +
                    `Amount: ZiG ${fmt(contrib.zig_today)}\n` +
                    `(${parseFloat(contrib.gold_grams).toFixed(6)}g gold)\n` +
                    '\n' +
                    '1. Confirm\n' +
                    '2. Cancel'
                );
            }

            if (inputs.length === 3) {
                if (inputs[2] === '1') {
                    const result = await api.contributeToMukando(
                        session.token,
                        group.group_id
                    );

                    const allPaid = result.group_status?.all_paid;
                    const paidStatus = result.group_status?.members_paid || '';

                    return end(
                        'Contribution confirmed!\n' +
                        '\n' +
                        `Group: ${group.name}\n` +
                        `Month: ${result.contribution?.month}\n` +
                        `Amount: ZiG ${fmt(result.contribution?.zig_amount)}\n` +
                        `Paid: ${paidStatus}\n` +
                        '\n' +
                        (allPaid ? 'All members paid!' :
                         'Your score improves.')
                    );
                } else {
                    return end('Contribution cancelled.');
                }
            }

        } catch (err) {
            const msg = api.getErrorMessage(err);
            // Handle "already contributed" gracefully
            if (msg.includes('Already contributed')) {
                return end(
                    'Already contributed\n' +
                    'for this month.\n' +
                    '\n' +
                    'Next contribution due\n' +
                    'next month. Well done!'
                );
            }
            return end(`Error: ${msg}`);
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
        'Mukando:\n' +
        '1. My Groups\n' +
        '2. Contribute\n' +
        '0. Back'
    );
}

module.exports = { handle };