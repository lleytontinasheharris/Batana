// ussd/src/index.js
// BATANA USSD Gateway — Africa's Talking webhook receiver
//
// Africa's Talking POSTs to this endpoint every time a user
// makes a selection on their feature phone.
//
// Request body (application/x-www-form-urlencoded):
//   sessionId    — unique per USSD session (changes each dial)
//   serviceCode  — the shortcode dialed (*227#)
//   phoneNumber  — user's phone with country code (+263771234567)
//   text         — cumulative input, "*"-separated ("1*2*500")
//   networkCode  — MNO code
//
// Response must be plain text:
//   CON <text>   — continue session, show menu
//   END <text>   — terminate session

require('dotenv').config();
const express = require('express');
const { route } = require('./menus/index');
const { normalizePhone } = require('./services/sessionManager');

const app = express();
const PORT = process.env.PORT || 4000;

// Africa's Talking sends form-encoded data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Health check ─────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        name: 'BATANA USSD Gateway',
        status: 'running',
        version: '1.0.0',
        backend: process.env.BACKEND_URL || 'http://localhost:5000',
        shortcode: '*227#',
        note: 'POST /ussd for Africa\'s Talking webhook'
    });
});

// ── USSD Webhook ─────────────────────────────────────────────
app.post('/ussd', async (req, res) => {
    const {
        sessionId,
        serviceCode,
        phoneNumber,
        text = '',
        networkCode
    } = req.body;

    // Validate required fields
    if (!sessionId || !phoneNumber) {
        console.error('[USSD] Missing required fields:', req.body);
        return res.send('END Service error. Please try again.');
    }

    // Normalize phone: +263771234567 → 0771234567
    const normalizedPhone = normalizePhone(phoneNumber);

    // Log incoming request
    console.log(
        `[USSD] ${new Date().toISOString()} | ` +
        `Session: ${sessionId} | ` +
        `Phone: ${normalizedPhone} | ` +
        `Text: "${text}" | ` +
        `Network: ${networkCode || 'unknown'}`
    );

    try {
        // Route to appropriate menu handler
        const response = await route(sessionId, normalizedPhone, text);

        // Log response type (CON or END)
        const responseType = response.startsWith('CON') ? 'CON' : 'END';
        console.log(`[USSD] Response: ${responseType} (${response.length} chars)`);

        // Africa's Talking requires plain text response
        res.set('Content-Type', 'text/plain');
        res.send(response);

    } catch (err) {
        console.error('[USSD] Unhandled error:', err.message, err.stack);
        // Always respond — never leave AT hanging
        res.set('Content-Type', 'text/plain');
        res.send('END An error occurred.\nPlease try again.\nDial *227#');
    }
});

// ── Test endpoint (development only) ─────────────────────────
// Simulates an Africa's Talking request without needing AT credentials
if (process.env.NODE_ENV !== 'production') {
    app.post('/test-ussd', async (req, res) => {
        const { phone = '0771234567', text = '', sessionId } = req.body;

        const testSessionId = sessionId ||
            `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const normalizedPhone = normalizePhone(phone.startsWith('+') ? phone : `+263${phone.slice(1)}`);

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

// ── Start server ─────────────────────────────────────────────
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
    console.log('║  *227# → PIN → Main                      ║');
    console.log('║  1. Wallet  2. Mukando  3. Score         ║');
    console.log('║  4. Loans   5. Insurance                 ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
});