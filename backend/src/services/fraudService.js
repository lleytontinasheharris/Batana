// backend/src/services/fraudService.js
// BATANA Transaction Guardian — Fraud & Scam Prevention

const supabase = require('../config/supabase');

async function assessTransferRisk({ userId, toPhone, amount, currency }) {
  const warnings = [];
  let score = 0;

  try {
    // ── 1. Resolve recipient user ID from phone ───────────
    const { data: recipient } = await supabase
      .from('users')
      .select('id, first_name, is_verified')
      .eq('phone_number', toPhone)
      .single();

    const recipientName     = recipient?.first_name    || 'UNKNOWN';
    const recipientVerified = recipient?.is_verified   || false;
    const recipientId       = recipient?.id            || null;

    // ── 2. Check if recipient is new ──────────────────────
    // Use to_user_id for accurate prior transfer lookup
    let priorCount = 0;

    if (recipientId) {
      const { data: priorTransfers } = await supabase
        .from('transactions')
        .select('id')
        .eq('from_user_id', userId)
        .eq('to_user_id', recipientId)
        .limit(10);

      priorCount = priorTransfers?.length || 0;
    }

    if (priorCount === 0) {
      warnings.push('New recipient — you have never sent to this number before');
      score += 30;
    }

    // ── 3. Transaction velocity — 2+ transfers in 5 minutes ──
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentTransfers } = await supabase
      .from('transactions')
      .select('id')
      .eq('from_user_id', userId)
      .ilike('type', '%transfer%')
      .gte('created_at', fiveMinutesAgo);

    if (recentTransfers && recentTransfers.length >= 2) {
      warnings.push('Multiple transfers in quick succession — take a moment to verify');
      score += 35;
    }

    // ── 4. Amount anomaly — compare to user's 90-day average ──
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: pastTransfers } = await supabase
      .from('transactions')
      .select('amount')
      .eq('from_user_id', userId)
      .ilike('type', '%transfer%')
      .gte('created_at', ninetyDaysAgo);

    if (pastTransfers && pastTransfers.length >= 3) {
      const avgAmount = pastTransfers.reduce(
        (sum, t) => sum + parseFloat(t.amount || 0), 0
      ) / pastTransfers.length;

      const amountZig = currency === 'USD' ? amount * 25.37 : amount;
      const avgZig    = avgAmount;

      if (avgZig > 0 && amountZig > avgZig * 8) {
        warnings.push('Unusually large — much higher than your typical transfer');
        score += 25;
      }
    } else {
      // No history yet — flag anything over ZiG 500
      const amountZig = currency === 'USD' ? amount * 25.37 : amount;
      if (amountZig > 500) {
        warnings.push('Large transfer — please double-check the recipient number');
        score += 15;
      }
    }

    // ── 5. Night-time transfer (10PM–5AM Zimbabwe time UTC+2) ──
    const hourZW = (new Date().getUTCHours() + 2) % 24;
    if (hourZW >= 22 || hourZW < 5) {
      warnings.push('Late-night transfer — fraud risk is higher at this hour');
      score += 15;
    }

    // ── 6. Round number to new recipient ─────────────────
    const amountNum = parseFloat(amount);
    const isRound   = amountNum % 100 === 0 && amountNum >= 200;
    if (isRound && priorCount === 0) {
      warnings.push('Round number to a new recipient — a common scam pattern');
      score += 10;
    }

    const finalScore = Math.min(score, 100);

    console.log(`[GUARDIAN] Score: ${finalScore} | Prior transfers: ${priorCount} | Warnings: ${warnings.length}`);

    return {
      score:             finalScore,
      riskLevel:         finalScore >= 75 ? 'HIGH' : finalScore >= 50 ? 'MEDIUM' : 'LOW',
      warnings,
      priorCount,
      recipientName,
      recipientVerified,
      safe:              finalScore < 50,
    };

  } catch (err) {
    console.error('[GUARDIAN] Risk assessment error:', err.message);
    // On error — do NOT silently allow. Return medium risk so user sees warning.
    return {
      score:             50,
      riskLevel:        'MEDIUM',
      warnings:         ['Could not complete fraud check — please verify recipient manually'],
      priorCount:       0,
      recipientName:    'Unknown',
      recipientVerified: false,
      safe:             false,
    };
  }
}

module.exports = { assessTransferRisk };