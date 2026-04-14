// ussd/src/services/apiClient.js
// Internal HTTP client — calls BATANA backend on behalf of USSD users
// All calls go to localhost:5000 (or BACKEND_URL)

const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
});

// ── AUTH ────────────────────────────────────────────────────

async function login(phone, pin) {
    // POST /api/users/login
    // body: { phone_number, pin }
    // Returns: { token, user: { first_name }, wallet }
    const resp = await api.post('/api/users/login', {
        phone_number: phone,
        pin: String(pin)
    });
    return resp.data;
}

// ── WALLET ──────────────────────────────────────────────────

async function getWallet(token) {
    // GET /api/wallet
    // Returns: { wallet: { zig_balance, usd_balance, gold_grams, gold_value_usd } }
    const resp = await api.get('/api/wallet', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return resp.data;
}

async function transfer(token, toPhone, amount, currency, purpose) {
    // POST /api/wallet/transfer
    // body: { to_phone, amount, currency, purpose }
    const resp = await api.post('/api/wallet/transfer',
        { to_phone: toPhone, amount: parseFloat(amount), currency, purpose },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return resp.data;
}

// ── MUKANDO ─────────────────────────────────────────────────

async function getMukandoGroups(phone) {
    // GET /api/mukando/user/:phone — public, no JWT
    // Returns: { user, mukando_groups: [...], total_groups }
    const resp = await api.get(`/api/mukando/user/${phone}`);
    return resp.data;
}

async function getMukandoGroup(groupId) {
    // GET /api/mukando/:groupId — public
    // Returns: { group, pool, contribution, this_month, members }
    const resp = await api.get(`/api/mukando/${groupId}`);
    return resp.data;
}

async function contributeToMukando(token, groupId) {
    // POST /api/mukando/:groupId/contribute
    // No body — amount is calculated server-side
    const resp = await api.post(
        `/api/mukando/${groupId}/contribute`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return resp.data;
}

// ── CREDIT SCORE ────────────────────────────────────────────

async function getUssdScore(phone) {
    // GET /api/credit/ussd/:phone — public, no JWT
    // Returns: { ussd_text, score, max_loan }
    // ussd_text is pre-formatted for feature phones
    const resp = await api.get(`/api/credit/ussd/${phone}`);
    return resp.data;
}

// ── LOANS ───────────────────────────────────────────────────

async function getLoanEligibility(token) {
    // GET /api/loans/eligibility — requires JWT
    // Returns: { eligible, score, max_loan_usd, interest_rate_pct, term_days, requires_store }
    const resp = await api.get('/api/loans/eligibility', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return resp.data;
}

async function applyForLoan(token, amountUsd, purpose, pin) {
    // POST /api/loans/apply
    // body: { amount_usd, purpose, pin }
    // Returns: { flow: 'instant'|'store_verification', loan, verification_code? }
    const resp = await api.post('/api/loans/apply',
        { amount_usd: parseFloat(amountUsd), purpose, pin: String(pin) },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return resp.data;
}

async function getMyLoans(token) {
    // GET /api/loans/my-loans — requires JWT
    // Returns: { loans, active_loan }
    const resp = await api.get('/api/loans/my-loans', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return resp.data;
}

async function repayLoan(token, loanId, amountZig) {
    // POST /api/loans/:loanId/repay
    // body: { amount_zig }
    const resp = await api.post(
        `/api/loans/${loanId}/repay`,
        { amount_zig: parseFloat(amountZig) },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return resp.data;
}

// ── INSURANCE ───────────────────────────────────────────────

async function getInsurancePlans() {
    // GET /api/insurance/plans — public
    // Returns: { plans: [{ id, name, premium_usd, premium_zig, cover_usd, cover_zig }] }
    const resp = await api.get('/api/insurance/plans');
    return resp.data;
}

async function getMyPolicies(token) {
    // GET /api/insurance/my-policies — requires JWT
    // Returns: { policies, active_count }
    const resp = await api.get('/api/insurance/my-policies', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return resp.data;
}

async function enrollInsurance(token, planId) {
    // POST /api/insurance/enroll
    // body: { plan_id }
    const resp = await api.post('/api/insurance/enroll',
        { plan_id: planId },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return resp.data;
}

async function claimInsurance(token, policyId, description, daysHospitalised) {
    // POST /api/insurance/claim/:policyId
    // body: { description, days_hospitalised }
    const body = { description };
    if (daysHospitalised) body.days_hospitalised = parseInt(daysHospitalised);
    const resp = await api.post(
        `/api/insurance/claim/${policyId}`,
        body,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return resp.data;
}

// ── ERROR HANDLER ───────────────────────────────────────────

// Extract clean error message from axios error
function getErrorMessage(err) {
    if (err.response) {
        const data = err.response.data;
        return data.error || data.message || data.errors?.[0] || 'Request failed';
    }
    if (err.code === 'ECONNREFUSED') {
        return 'Service unavailable. Try again later.';
    }
    if (err.code === 'ETIMEDOUT') {
        return 'Request timed out. Try again.';
    }
    return err.message || 'Unknown error';
}

module.exports = {
    login,
    getWallet,
    transfer,
    getMukandoGroups,
    getMukandoGroup,
    contributeToMukando,
    getUssdScore,
    getLoanEligibility,
    applyForLoan,
    getMyLoans,
    repayLoan,
    getInsurancePlans,
    getMyPolicies,
    enrollInsurance,
    claimInsurance,
    getErrorMessage
};