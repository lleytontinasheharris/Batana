// ussd/src/menus/index.js
// Central router — receives parsed USSD input and routes to correct menu handler
// Africa's Talking sends cumulative input separated by *
// e.g., text="1*2*500" means: main→1, wallet→2, amount→500

const { getSession, updateSession, deleteSession } = require('../services/sessionManager');

// CON = continue session (show menu, wait for input)
// END = terminate session
function con(text) { return `CON ${text}`; }
function end(text) { return `END ${text}`; }

// Export immediately to avoid circular dependency
module.exports = { con, end };

// Import menus AFTER exporting con/end
const authMenu    = require('./auth');
const mainMenu    = require('./main');
const walletMenu  = require('./wallet');
const mukandoMenu = require('./mukando');
const scoreMenu   = require('./score');
const loansMenu   = require('./loans');
const insuranceMenu = require('./insurance');

async function route(sessionId, phoneNumber, rawText) {
    // Parse input — AT sends cumulative "*"-separated inputs
    // [""] on first dial, ["1"], ["1","2"], ["1","2","500"] etc.
    const inputs = rawText === '' ? [] : rawText.split('*');
    const session = await getSession(sessionId);

    // ── STEP 1: Authentication gate ─────────────────────────
    // If no session or not authenticated, go to auth flow
    if (!session || !session.authenticated) {
        return authMenu.handle(sessionId, phoneNumber, inputs, session);
    }

    // ── STEP 2: Route by current menu ───────────────────────
    // After auth, inputs[1] onward are menu selections
    // inputs[0] is always the PIN (consumed by auth)
    const menuInputs = inputs.slice(1); // Everything after PIN
    const currentMenu = session.menu || 'main';

    // If user just authenticated (no further input), show main menu
    if (menuInputs.length === 0) {
        return mainMenu.handle(sessionId, session, []);
    }

    // Route to active menu
    switch (currentMenu) {
        case 'main':
            return mainMenu.handle(sessionId, session, menuInputs);
        case 'wallet':
            return walletMenu.handle(sessionId, session, menuInputs);
        case 'mukando':
            return mukandoMenu.handle(sessionId, session, menuInputs);
        case 'score':
            return scoreMenu.handle(sessionId, session, menuInputs);
        case 'loans':
            return loansMenu.handle(sessionId, session, menuInputs);
        case 'insurance':
            return insuranceMenu.handle(sessionId, session, menuInputs);
        default:
            // Unknown menu — reset to main
            await updateSession(sessionId, { menu: 'main', step: 0, data: {} });
            return mainMenu.handle(sessionId, session, []);
    }
}

// Export route function
module.exports.route = route;