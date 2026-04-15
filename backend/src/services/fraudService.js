// backend/src/services/fraudService.js
// BATANA Transaction Guardian — Fraud & Scam Prevention
// Designed for Zimbabwe's specific fraud patterns

const supabase = require('../config/supabase');

/**
 * Assess the risk of a transfer before it executes.
 * Returns a risk score 0–100 and an array of warning messages.
 *
 * Score bands:
 *   0–49  → Low risk   → transfer executes immediately
 *   50–74 → Medium risk → user sees warning, can confirm
 *   75+   → High risk  → user sees strong warning, can confirm
 */
async function assessTransferRisk({ userId, toPhone, amount, currency }) {
  const warnings = [];
  let score = 0;

  try {
    // ── 1. Check if recipient is new ──────────────────────
    const { data: priorTransfers } = await supabase
      .from('transactions')
      .select('id')
      .eq('from_user_id', userId)
      .ilike('description', `%${toPhone}%`)
      .eq('type', 'transfer')
      .limit(5);

    const priorCount = priorTransfers?.length || 0;

    if (priorCount === 0) {
      warnings.push('New recipient — you have never sent to this number before');
      score += 30;
    }

    // ── 2. Transaction velocity — 3+ transfers in 5 minutes ──
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentTransfers } = await supabase
      .from('transactions')
      .select('id')
      .eq('from_user_id', userId)
      .eq('type', 'transfer')
      .gte('created_at', fiveMinutesAgo);

    if (recentTransfers && recentTransfers.length >= 2) {
      warnings.push('Multiple transfers in quick succession — take a moment to verify');
      score += 35;
    }

    // ── 3. Amount anomaly — compare to user's average ────
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: pastTransfers } = await supabase
      .from('transactions')
      .select('amount, currency')
      .eq('from_user_id', userId)
      .eq('type', 'transfer')
      .gte('created_at', ninetyDaysAgo);

    if (pastTransfers && pastTransfers.length >= 3) {
      const avgAmount = pastTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0) / pastTransfers.length;

      // Normalise to ZiG for comparison
      const amountZig = currency === 'USD' ? amount * 25.37 : amount;
      const avgZig    = avgAmount; // Stored amounts are in transaction currency — approximate

      if (amountZig > avgZig * 8) {
        warnings.push(`Unusually large amount — much higher than your typical transfer`);
        score += 25;
      }
    } else if (amount > 500) {
      // No history — flag large amounts
      warnings.push('Large transfer amount — please double-check the recipient');
      score += 15;
    }

    // ── 4. Night-time transfer (10PM–5AM Zimbabwe time) ──
    // Zimbabwe is UTC+2
    const nowUTC   = new Date();
    const hourZW   = (nowUTC.getUTCHours() + 2) % 24;
    if (hourZW >= 22 || hourZW < 5) {
      warnings.push('Late-night transfer — fraud risk is higher at this hour');
      score += 15;
    }

    // ── 5. Round number check (common in social engineering) ──
    // Scammers often instruct victims to send exact round amounts
    const isRound = amount % 100 === 0 && amount >= 200;
    if (isRound && priorCount === 0) {
      warnings.push('Round number sent to a new recipient — a common scam pattern');
      score += 10;
    }

    // ── 6. Check if recipient exists in BATANA ────────────
    const { data: recipient } = await supabase
      .from('users')
      .select('id, first_name, is_verified')
      .eq('phone_number', toPhone)
      .single();

    const recipientName = recipient?.first_name || 'UNKNOWN';
    const recipientVerified = recipient?.is_verified || false;

    return {
      score:              Math.min(score, 100),
      riskLevel:          score >= 75 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW',
      warnings,
      priorCount,
      recipientName,
      recipientVerified,
      safe:               score < 50,
    };

  } catch (err) {
    // If risk check fails, do not block the transfer — log and allow
    console.error('[GUARDIAN] Risk assessment error:', err.message);
    return {
      score:         0,
      riskLevel:    'LOW',
      warnings:     [],
      priorCount:   0,
      recipientName: 'Unknown',
      recipientVerified: false,
      safe:          true,
    };
  }
}

module.exports = { assessTransferRisk };