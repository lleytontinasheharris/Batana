// ussd/src/index.js
require('dotenv').config();
const express = require('express');
const { route } = require('./menus/index');
const { normalizePhone } = require('./services/sessionManager');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Parse incoming requests ───────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Allow all origins ─────────────────────────────────────
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ── Log every request for debugging ──────────────────────
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    console.log(`[BODY]`, JSON.stringify(req.body));
    next();
});

// ── Health check ──────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        name: 'BATANA USSD Gateway',
        status: 'running',
        version: '1.0.0',
        backend: process.env.BACKEND_URL || 'http://localhost:5000',
        shortcode: '*384*34506#',
        note: 'POST /ussd for Africa\'s Talking webhook'
    });
});

// ── Ping test — open in browser to confirm server works ───
app.get('/ping', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(
        'CON Welcome to BATANA\n' +
        'Building Together\n' +
        '\n' +
        'Enter your 4-digit PIN:'
    );
});

// ── USSD Webhook ──────────────────────────────────────────
app.post('/ussd', async (req, res) => {
    const {
        sessionId,
        serviceCode,
        phoneNumber,
        text = '',
        networkCode
    } = req.body;

    console.log(`[USSD] Session: ${sessionId} | Phone: ${phoneNumber} | Text: "${text}"`);

    // Validate required fields
    if (!sessionId || !phoneNumber) {
        console.error('[USSD] Missing required fields:', req.body);
        res.set('Content-Type', 'text/plain');
        return res.send('END Service error. Please try again.');
    }

    // Normalize phone: +263771234567 → 0771234567
    const normalizedPhone = normalizePhone(phoneNumber);
    console.log(`[USSD] Normalized phone: ${normalizedPhone}`);

    try {
        const response = await route(sessionId, normalizedPhone, text);

        const responseType = response.startsWith('CON') ? 'CON' : 'END';
        console.log(`[USSD] Responding with ${responseType} (${response.length} chars)`);
        console.log(`[USSD] Response text: ${response}`);

        res.set('Content-Type', 'text/plain');
        res.send(response);

    } catch (err) {
        console.error('[USSD] Error:', err.message);
        console.error('[USSD] Stack:', err.stack);
        res.set('Content-Type', 'text/plain');
        res.send('END An error occurred.\nPlease try again.\nDial *384*34506#');
    }
});

// ── Test endpoint (development only) ─────────────────────
if (process.env.NODE_ENV !== 'production') {
    app.post('/test-ussd', async (req, res) => {
        const { phone = '0771234567', text = '', sessionId } = req.body;

        const testSessionId = sessionId ||
            `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const normalizedPhone = normalizePhone(
            phone.startsWith('+') ? phone : `+263${phone.slice(1)}`
        );

        console.log(`[TEST] Phone: ${normalizedPhone} | Text: "${text}" | Session: ${testSessionId}`);

        try {
            const response = await route(testSessionId, normalizedPhone, text);
            res.json({
                sessionId: testSessionId,
                input: text,
                response: response,
                type: response.startsWith('CON') ? 'CON' : 'END',
                charCount: response.length
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    console.log('[USSD] Test endpoint active: POST /test-ussd');
}

// ── Start server ──────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║      BATANA USSD Gateway v1.0.0          ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Status  : RUNNING                       ║`);
    console.log(`║  Port    : ${PORT}                           ║`);
    console.log(`║  Webhook : POST /ussd                    ║`);
    console.log(`║  Test    : POST /test-ussd               ║`);
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Backend : ${(process.env.BACKEND_URL || 'http://localhost:5000').padEnd(30)}║`);
    console.log('╠══════════════════════════════════════════╣');
    console.log('║  Menus:                                  ║');
    console.log('║  *384*34506# → PIN → Main                ║');
    console.log('║  1. Wallet  2. Mukando  3. Score         ║');
    console.log('║  4. Loans   5. Insurance                 ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
});