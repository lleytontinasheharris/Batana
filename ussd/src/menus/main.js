// ussd/src/menus/main.js
// Root menu — shown after successful PIN authentication
// All sub-menus return here when user selects "0. Back"

const { updateSession } = require('../services/sessionManager');
const { con, end } = require('./index');

// Lazy-load sub-menus to avoid circular dependency issues
function getWalletMenu()    { return require('./wallet'); }
function getMukandoMenu()   { return require('./mukando'); }
function getScoreMenu()     { return require('./score'); }
function getLoansMenu()     { return require('./loans'); }
function getInsuranceMenu() { return require('./insurance'); }

async function handle(sessionId, session, inputs) {
    // inputs is menuInputs (everything after the PIN)
    // inputs[0] is main menu selection

    // ── Show main menu ───────────────────────────────────────
    if (inputs.length === 0) {
        await updateSession(sessionId, { menu: 'main', step: 0, data: {} });
        return con(
            `BATANA — ${session.firstName}\n` +
            '\n' +
            '1. My Wallet\n' +
            '2. Mukando\n' +
            '3. Vimbiso Score\n' +
            '4. Loans\n' +
            '5. Insurance\n' +
            '0. Exit'
        );
    }

    const choice = inputs[0];

    switch (choice) {
        case '1':
            await updateSession(sessionId, { menu: 'wallet', step: 0, data: {} });
            return getWalletMenu().handle(sessionId, session, inputs.slice(1));

        case '2':
            await updateSession(sessionId, { menu: 'mukando', step: 0, data: {} });
            return getMukandoMenu().handle(sessionId, session, inputs.slice(1));

        case '3':
            await updateSession(sessionId, { menu: 'score', step: 0, data: {} });
            return getScoreMenu().handle(sessionId, session, inputs.slice(1));

        case '4':
            await updateSession(sessionId, { menu: 'loans', step: 0, data: {} });
            return getLoansMenu().handle(sessionId, session, inputs.slice(1));

        case '5':
            await updateSession(sessionId, { menu: 'insurance', step: 0, data: {} });
            return getInsuranceMenu().handle(sessionId, session, inputs.slice(1));

        case '0':
            return end(
                'Thank you for using BATANA.\n' +
                'Building Together.\n' 
            );

        default:
            return con(
                'Invalid option.\n' +
                '\n' +
                'BATANA Menu:\n' +
                '1. My Wallet\n' +
                '2. Mukando\n' +
                '3. Vimbiso Score\n' +
                '4. Loans\n' +
                '5. Insurance\n' +
                '0. Exit'
            );
    }
}

module.exports = { handle };