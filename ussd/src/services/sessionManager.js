// ussd/src/services/sessionManager.js
// Manages USSD session state in Redis
// Each Africa's Talking request includes sessionId — we store state by sessionId

const { getRedisClient } = require('../config/redis');

// Session TTL: 5 minutes (USSD sessions timeout quickly)
const TTL = parseInt(process.env.SESSION_TTL_SECONDS) || 300;

// Session structure:
// {
//   phone: "0771234567",           ← normalized Zimbabwe phone
//   token: "eyJhbG...",            ← JWT from backend login
//   firstName: "Mai",              ← for personalised messages
//   authenticated: true,
//   menu: "main",                  ← current menu position
//   step: 0,                       ← step within a multi-step flow
//   data: {}                       ← temp data (amount, purpose, etc.)
// }

async function getSession(sessionId) {
    const redis = getRedisClient();
    const raw = await redis.get(`ussd:${sessionId}`);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

async function setSession(sessionId, data) {
    const redis = getRedisClient();
    await redis.set(
        `ussd:${sessionId}`,
        JSON.stringify(data),
        'EX',
        TTL
    );
}

async function updateSession(sessionId, updates) {
    const existing = await getSession(sessionId) || {};
    const updated = { ...existing, ...updates };
    await setSession(sessionId, updated);
    return updated;
}

async function deleteSession(sessionId) {
    const redis = getRedisClient();
    await redis.del(`ussd:${sessionId}`);
}

// Normalize Zimbabwe phone number to 07XXXXXXXX format
// Africa's Talking sends: +263771234567
// Our backend expects:    0771234567
function normalizePhone(phone) {
    if (!phone) return null;
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.startsWith('+263')) {
        return '0' + cleaned.slice(4);
    }
    if (cleaned.startsWith('263')) {
        return '0' + cleaned.slice(3);
    }
    return cleaned;
}

module.exports = {
    getSession,
    setSession,
    updateSession,
    deleteSession,
    normalizePhone
};