// ussd/src/menus/score.js
// Vimbiso Score menu
// Uses the pre-built /api/credit/ussd/:phone endpoint
// which returns formatted text ready for feature phones

const { updateSession } = require('../services/sessionManager');
const api = require('../services/apiClient');
const { con, end } = require('./index');

async function handle(sessionId, session, inputs) {
    // ── Fetch and display score immediately ──────────────────
    // The backend has a dedicated USSD endpoint that pre-formats
    // the score display for feature phones. Use it directly.
    if (inputs.length === 0) {
        try {
            const data = await api.getUssdScore(session.phone);

            // data.ussd_text is pre-formatted by the backend:
            // "Vimbiso Score: 72/100\n★★★★☆\n..."
            // We append navigation options
            return con(
                data.ussd_text + '\n' +
                '0. Back'
            );
        } catch (err) {
            return con(
                'Score unavailable.\n' +
                'Try again later.\n' +
                '\n' +
                '0. Back'
            );
        }
    }

    const choice = inputs[0];

    // ── Handle score sub-menu choices ────────────────────────
    // The backend ussd_text ends with:
    // "1. Apply for loan\n2. How to improve\n3. Back"
    // We intercept these choices here

    if (choice === '1') {
        // Go to loans menu
        await updateSession(sessionId, { menu: 'loans', step: 0, data: {} });
        const loansMenu = require('./loans');
        return loansMenu.handle(sessionId, session, []);
    }

    if (choice === '2') {
        // Show improvement tips
        try {
            const data = await api.getUssdScore(session.phone);
            const score = data.score || 0;

            let tips = 'How to improve:\n\n';
            if (score < 30) {
                tips += '- Join a mukando group\n- Make monthly contributions\n- Save regularly';
            } else if (score < 60) {
                tips += '- Contribute every month\n- Get insurance cover\n- Use BATANA daily';
            } else {
                tips += '- Complete mukando cycle\n- Repay loans on time\n- Keep saving gold';
            }
            tips += '\n\n0. Back';

            return con(tips);
        } catch {
            return con('Improvement tips\nnot available.\n\n0. Back');
        }
    }

    if (choice === '0' || choice === '3') {
        await updateSession(sessionId, { menu: 'main', step: 0, data: {} });
        const mainMenu = require('./main');
        return mainMenu.handle(sessionId, session, []);
    }

    // Re-show score on invalid input
    return handle(sessionId, session, []);
}

module.exports = { handle };