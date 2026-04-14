// ussd/src/menus/auth.js
// Handles the authentication flow before any menu is shown
// Flow:
//   Dial *227# → "Welcome to BATANA. Enter PIN:"
//   User enters 1234 → POST /api/users/login
//   Success → store JWT in Redis → show main menu
//   Fail → "Incorrect PIN. Try again." (3 attempts max)

const { setSession, updateSession, getSession } = require('../services/sessionManager');
const api = require('../services/apiClient');
const { con, end } = require('./index');
const mainMenu = require('./main');

const MAX_ATTEMPTS = 3;

async function handle(sessionId, phoneNumber, inputs, existingSession) {
    // inputs is the full cumulative array from AT
    // inputs[0] is the PIN attempt (first user input after dialing)

    // ── First contact — no input yet ────────────────────────
    if (inputs.length === 0) {
        // Initialize session with phone and attempt count
        await setSession(sessionId, {
            phone: phoneNumber,
            authenticated: false,
            attempts: 0,
            menu: null,
            step: 0,
            data: {}
        });

        return con(
            'Welcome to BATANA\n' +
            'Building Together\n' +
            '\n' +
            'Enter your 4-digit PIN:'
        );
    }

    // ── PIN entered ──────────────────────────────────────────
    const pin = inputs[0];
    const session = existingSession || await getSession(sessionId) || {
        phone: phoneNumber,
        attempts: 0
    };

    const attempts = (session.attempts || 0) + 1;

    // Validate PIN format before hitting the API
    if (!/^\d{4}$/.test(pin)) {
        if (attempts >= MAX_ATTEMPTS) {
            await setSession(sessionId, { ...session, authenticated: false });
            return end(
                'Too many failed attempts.\n' +
                'Your account is temporarily locked.\n' +
                'Please try again in 15 minutes.'
            );
        }
        await updateSession(sessionId, { attempts });
        return con(
            `Invalid PIN. Must be 4 digits.\n` +
            `Attempt ${attempts}/${MAX_ATTEMPTS}\n` +
            '\n' +
            'Enter your 4-digit PIN:'
        );
    }

    // ── Call backend login ───────────────────────────────────
    try {
        const loginData = await api.login(session.phone, pin);
        // Success — store JWT and user info
        await setSession(sessionId, {
            phone: session.phone,
            authenticated: true,
            token: loginData.token,
            firstName: loginData.user.first_name || 'User',
            userId: loginData.user.id,
            attempts: 0,
            menu: 'main',
            step: 0,
            data: {}
        });

        // Show main menu immediately after auth
        const authenticatedSession = {
            phone: session.phone,
            authenticated: true,
            token: loginData.token,
            firstName: loginData.user.first_name || 'User',
            menu: 'main',
            step: 0,
            data: {}
        };
        return mainMenu.handle(sessionId, authenticatedSession, []);

    } catch (err) {
        const errMsg = api.getErrorMessage(err);
        const isInvalidCreds = errMsg.includes('Invalid credentials') ||
                               errMsg.includes('credentials');

        if (attempts >= MAX_ATTEMPTS) {
            await updateSession(sessionId, { attempts, authenticated: false });
            return end(
                'Too many failed attempts.\n' +
                'Try again in 15 minutes.\n' +
                'Call 0800 BATANA for help.'
            );
        }

        await updateSession(sessionId, { attempts, authenticated: false });

        const msg = isInvalidCreds ? 'Incorrect PIN.' : 'Login failed.';
        return con(
            `${msg} Try again.\n` +
            `Attempt ${attempts}/${MAX_ATTEMPTS}\n` +
            '\n' +
            'Enter your 4-digit PIN:'
        );
    }
}

module.exports = { handle };