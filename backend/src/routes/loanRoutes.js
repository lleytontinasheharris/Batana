// backend/src/routes/loanRoutes.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const exchangeService = require('../services/exchangeService');
const creditService = require('../services/creditService');
const { requireAuth } = require('../middleware/auth');

// ── LOAN TIERS ─────────────────────────────────────────────
function getLoanTier(score) {
  if (score >= 80) {
    return {
      max_usd: 500,
      interest_rate: 0.05,
      term_days: 90,
      label: 'Excellent',
      requires_store: true,
    };
  } else if (score >= 60) {
    return {
      max_usd: 200,
      interest_rate: 0.08,
      term_days: 60,
      label: 'Good',
      requires_store: true,
    };
  } else if (score >= 40) {
    return {
      max_usd: 50,
      interest_rate: 0.10,
      term_days: 30,
      label: 'Building',
      requires_store: true,
    };
  } else if (score >= 20) {
    return {
      max_usd: 20,
      interest_rate: 0.12,
      term_days: 14,
      label: 'Starting',
      requires_store: false, // Micro-loan — instant disbursement
    };
  }
  return null;
}

// ── GENERATE VERIFICATION CODE ─────────────────────────────
// Produces BAT-XXXXXX (6 alphanumeric chars, uppercase, no ambiguous chars)
function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0,O,1,I
  let code = 'BAT-';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// ── GET /api/loans/eligibility ─────────────────────────────
router.get('/eligibility', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rates = exchangeService.getExchangeRates();
    const rate = rates.official_rate;

    const scoreResult = await creditService.calculateVimbisoScore(userId);
    const tier = getLoanTier(scoreResult.score);

    if (!tier) {
      return res.json({
        eligible: false,
        score: scoreResult.score,
        score_label: 'Not yet eligible',
        reason: 'Your Vimbiso Score needs to reach at least 20 to qualify for a loan.',
        how_to_improve: scoreResult.factors,
      });
    }

    // Check for active loans
    const { data: activeLoans } = await supabase
      .from('loans')
      .select('id, amount_usd, amount_zig, status, due_date')
      .eq('user_id', userId)
      .in('status', ['active', 'disbursed', 'pending_store', 'pending_admin']);

    if (activeLoans && activeLoans.length > 0) {
      const loan = activeLoans[0];
      return res.json({
        eligible: false,
        score: scoreResult.score,
        reason: loan.status === 'pending_store'
          ? 'You have a loan awaiting store verification. Visit a BATANA store to continue.'
          : loan.status === 'pending_admin'
          ? 'Your loan is awaiting admin approval. You will be notified shortly.'
          : 'You have an active loan. Repay it before applying for another.',
        active_loan: {
          amount_zig: loan.amount_zig,
          amount_usd: loan.amount_usd,
          due_date: loan.due_date,
          status: loan.status,
        },
      });
    }

    res.json({
      eligible: true,
      score: scoreResult.score,
      score_label: tier.label,
      max_loan_usd: tier.max_usd,
      max_loan_zig: Math.round(tier.max_usd * rate * 100) / 100,
      interest_rate: tier.interest_rate,
      interest_rate_pct: `${tier.interest_rate * 100}%`,
      term_days: tier.term_days,
      requires_store: tier.requires_store,
      rate_used: rate,
      example: {
        borrow_zig: Math.round(tier.max_usd * rate * 100) / 100,
        borrow_usd: tier.max_usd,
        repay_zig: Math.round(tier.max_usd * (1 + tier.interest_rate) * rate * 100) / 100,
        repay_usd: Math.round(tier.max_usd * (1 + tier.interest_rate) * 100) / 100,
        interest_zig: Math.round(tier.max_usd * tier.interest_rate * rate * 100) / 100,
        interest_usd: Math.round(tier.max_usd * tier.interest_rate * 100) / 100,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/loans/apply ──────────────────────────────────
// Full new flow:
//   1. Validate amount + score
//   2. Verify PIN
//   3. Snapshot next of kin
//   4. Score 20–39 → instant disbursement
//   5. Score 40+   → generate BAT code, status = pending_store
router.post('/apply', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount_usd, purpose, pin, next_of_kin_id } = req.body;

    // ── Basic validation ──
    if (!amount_usd || isNaN(parseFloat(amount_usd)) || parseFloat(amount_usd) <= 0) {
      return res.status(400).json({ error: 'Valid loan amount is required' });
    }
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required to confirm your application' });
    }

    const rates = exchangeService.getExchangeRates();
    const rate = rates.official_rate;
    const amountUsd = parseFloat(amount_usd);
    const amountZig = Math.round(amountUsd * rate * 100) / 100;

    // ── Score check ──
    const scoreResult = await creditService.calculateVimbisoScore(userId);
    const tier = getLoanTier(scoreResult.score);

    if (!tier) {
      return res.status(400).json({
        error: 'Your Vimbiso Score is too low. You need at least 20 to qualify for a loan.',
      });
    }
    if (amountUsd > tier.max_usd) {
      return res.status(400).json({
        error: `Maximum loan for your score is US$${tier.max_usd}`,
      });
    }

    // ── Active loan check ──
    const { data: activeLoans } = await supabase
      .from('loans')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'disbursed', 'pending_store', 'pending_admin']);

    if (activeLoans && activeLoans.length > 0) {
      return res.status(409).json({
        error: 'You already have an active loan. Repay it before applying for another.',
      });
    }

    // ── Verify PIN ──
    const { data: user } = await supabase
      .from('users')
      .select('pin_hash')
      .eq('id', userId)
      .single();

    if (!user) return res.status(404).json({ error: 'User not found' });

    const pinValid = await bcrypt.compare(String(pin), user.pin_hash);
    if (!pinValid) {
      return res.status(401).json({ error: 'Incorrect PIN. Please try again.' });
    }

    // ── Next of kin snapshot ──
    let kinSnapshot = null;
    let resolvedKinId = next_of_kin_id || null;

    if (next_of_kin_id) {
      // Use selected kin
      const { data: kin } = await supabase
        .from('next_of_kin')
        .select('*')
        .eq('id', next_of_kin_id)
        .eq('user_id', userId)
        .single();

      if (!kin) {
        return res.status(400).json({ error: 'Selected next of kin not found' });
      }
      kinSnapshot = {
        full_name: kin.full_name,
        relationship: kin.relationship,
        phone_number: kin.phone_number,
        national_id: kin.national_id,
      };
    } else {
      // Try to use primary kin automatically
      const { data: primaryKin } = await supabase
        .from('next_of_kin')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single();

      if (primaryKin) {
        resolvedKinId = primaryKin.id;
        kinSnapshot = {
          full_name: primaryKin.full_name,
          relationship: primaryKin.relationship,
          phone_number: primaryKin.phone_number,
          national_id: primaryKin.national_id,
        };
      }
      // No kin is fine — not mandatory for micro-loans
    }

    // ── Repayment calculations ──
    const totalRepaymentUsd = Math.round(amountUsd * (1 + tier.interest_rate) * 100) / 100;
    const totalRepaymentZig = Math.round(totalRepaymentUsd * rate * 100) / 100;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + tier.term_days);

    // ── Insurance link ──
    const { data: activePolicies } = await supabase
      .from('insurance_policies')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    const linkedInsuranceId = activePolicies && activePolicies.length > 0
      ? activePolicies[0].id
      : null;

    // ── MICRO-LOAN PATH (score 20–39, no store visit) ──────
    if (!tier.requires_store) {
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .insert({
          user_id: userId,
          amount_usd: amountUsd,
          amount_zig: amountZig,
          interest_rate: tier.interest_rate,
          total_repayment: totalRepaymentUsd,
          amount_repaid: 0,
          term_days: tier.term_days,
          purpose: purpose || 'general',
          status: 'disbursed',
          linked_insurance_id: linkedInsuranceId,
          disbursed_at: new Date().toISOString(),
          due_date: dueDate.toISOString().split('T')[0],
          vimbiso_score_at_application: scoreResult.score,
          applied_at: new Date().toISOString(),
          pin_verified: true,
          requires_store_visit: false,
          next_of_kin_id: resolvedKinId,
          next_of_kin_snapshot: kinSnapshot,
        })
        .select()
        .single();

      if (loanError) return res.status(500).json({ error: loanError.message });

      // Credit wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('zig_balance')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            zig_balance: parseFloat(wallet.zig_balance) + amountZig,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          to_user_id: userId,
          type: 'loan_disbursement',
          amount: amountZig,
          currency: 'ZiG',
          status: 'completed',
          description: `Micro-loan disbursement — ${purpose || 'general'}`,
        });

      return res.status(201).json({
        status: 'success',
        flow: 'instant',
        message: `ZiG ${amountZig.toLocaleString()} disbursed to your wallet`,
        loan: {
          id: loan.id,
          amount_zig: amountZig,
          amount_usd: amountUsd,
          total_repayment_zig: totalRepaymentZig,
          total_repayment_usd: totalRepaymentUsd,
          interest_rate_pct: `${tier.interest_rate * 100}%`,
          term_days: tier.term_days,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'disbursed',
        },
        note: 'Micro-loan approved instantly. Repay within 14 days to build your score.',
      });
    }

    // ── STANDARD LOAN PATH (score 40+, requires store visit) ─
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date();
    codeExpiry.setDate(codeExpiry.getDate() + 7); // Code valid 7 days

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .insert({
        user_id: userId,
        amount_usd: amountUsd,
        amount_zig: amountZig,
        interest_rate: tier.interest_rate,
        total_repayment: totalRepaymentUsd,
        amount_repaid: 0,
        term_days: tier.term_days,
        purpose: purpose || 'general',
        status: 'pending_store',
        linked_insurance_id: linkedInsuranceId,
        due_date: dueDate.toISOString().split('T')[0],
        vimbiso_score_at_application: scoreResult.score,
        applied_at: new Date().toISOString(),
        pin_verified: true,
        requires_store_visit: true,
        next_of_kin_id: resolvedKinId,
        next_of_kin_snapshot: kinSnapshot,
        verification_code: verificationCode,
      })
      .select()
      .single();

    if (loanError) return res.status(500).json({ error: loanError.message });

    // Log in store_verifications table
    await supabase
      .from('store_verifications')
      .insert({
        loan_id: loan.id,
        verification_code: verificationCode,
        expires_at: codeExpiry.toISOString(),
      });

    return res.status(201).json({
      status: 'success',
      flow: 'store_verification',
      message: 'Application submitted. Visit a BATANA store to verify your identity.',
      loan: {
        id: loan.id,
        amount_zig: amountZig,
        amount_usd: amountUsd,
        total_repayment_zig: totalRepaymentZig,
        total_repayment_usd: totalRepaymentUsd,
        interest_rate_pct: `${tier.interest_rate * 100}%`,
        term_days: tier.term_days,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending_store',
      },
      verification_code: verificationCode,
      code_expires: codeExpiry.toISOString().split('T')[0],
      next_steps: [
        'Write down or screenshot your verification code',
        'Visit any BATANA store or ZB Bank agent',
        'Bring your National ID or Passport',
        'Give the attendant your code: ' + verificationCode,
        'Once verified, your loan will be reviewed and approved within 24 hours',
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/loans/my-loans ────────────────────────────────
router.get('/my-loans', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rates = exchangeService.getExchangeRates();
    const rate = rates.official_rate;

    const { data: loans, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const enriched = (loans || []).map((loan) => {
      const amountRepaid = parseFloat(loan.amount_repaid || 0);
      const totalRepayment = parseFloat(loan.total_repayment || 0);
      const remaining = Math.max(0, totalRepayment - amountRepaid);
      const remainingZig = Math.round(remaining * rate * 100) / 100;
      const isActive = loan.status === 'disbursed' || loan.status === 'active';
      const isOverdue = isActive && new Date(loan.due_date) < new Date();

      return {
        ...loan,
        amount_zig: loan.amount_zig ||
          Math.round(parseFloat(loan.amount_usd || 0) * rate * 100) / 100,
        total_repayment_zig: Math.round(totalRepayment * rate * 100) / 100,
        amount_repaid_zig: Math.round(amountRepaid * rate * 100) / 100,
        remaining_usd: Math.round(remaining * 100) / 100,
        remaining_zig: remainingZig,
        is_overdue: isOverdue,
        progress_pct: totalRepayment > 0
          ? Math.round((amountRepaid / totalRepayment) * 100)
          : 0,
        // Only expose code for pending_store loans (user needs it)
        verification_code: loan.status === 'pending_store'
          ? loan.verification_code
          : undefined,
      };
    });

    const activeLoan = enriched.find((l) =>
      ['disbursed', 'active', 'pending_store', 'pending_admin'].includes(l.status)
    );

    res.json({
      status: 'success',
      loans: enriched,
      active_loan: activeLoan || null,
      total_loans: enriched.length,
      completed_loans: enriched.filter((l) => l.status === 'completed').length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/loans/:loanId/repay ──────────────────────────
router.post('/:loanId/repay', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { loanId } = req.params;
    const { amount_zig } = req.body;

    if (!amount_zig || isNaN(parseFloat(amount_zig)) || parseFloat(amount_zig) <= 0) {
      return res.status(400).json({ error: 'Valid repayment amount in ZiG is required' });
    }

    const rates = exchangeService.getExchangeRates();
    const rate = rates.official_rate;
    const repayZig = parseFloat(amount_zig);
    const repayUsd = Math.round((repayZig / rate) * 100) / 100;

    // Get loan
    const { data: loan } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .eq('user_id', userId)
      .single();

    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status === 'completed') {
      return res.status(400).json({ error: 'This loan is already fully repaid' });
    }
    if (!['disbursed', 'active'].includes(loan.status)) {
      return res.status(400).json({
        error: `Cannot repay a loan with status: ${loan.status}`,
      });
    }

    // Check wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('zig_balance')
      .eq('user_id', userId)
      .single();

    if (!wallet || parseFloat(wallet.zig_balance) < repayZig) {
      return res.status(400).json({
        error: `Insufficient balance. Need ZiG ${repayZig.toLocaleString()} but have ZiG ${parseFloat(wallet?.zig_balance || 0).toLocaleString()}`,
      });
    }

    const totalRepayment = parseFloat(loan.total_repayment);
    const alreadyRepaid = parseFloat(loan.amount_repaid || 0);
    const remaining = totalRepayment - alreadyRepaid;

    // Cap at remaining
    const actualRepayUsd = Math.min(repayUsd, remaining);
    const actualRepayZig = Math.min(
      repayZig,
      Math.round(remaining * rate * 100) / 100
    );
    const newAmountRepaid = alreadyRepaid + actualRepayUsd;
    const isFullyRepaid = newAmountRepaid >= totalRepayment - 0.01;

    // Deduct from wallet
    await supabase
      .from('wallets')
      .update({
        zig_balance: parseFloat(wallet.zig_balance) - actualRepayZig,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Update loan
    await supabase
      .from('loans')
      .update({
        amount_repaid: newAmountRepaid,
        ...(isFullyRepaid && {
          status: 'completed',
          completed_at: new Date().toISOString(),
        }),
      })
      .eq('id', loanId);

    // Record transaction
    await supabase
      .from('transactions')
      .insert({
        from_user_id: userId,
        type: 'loan_repayment',
        amount: actualRepayZig,
        currency: 'ZiG',
        status: 'completed',
        description: `Loan repayment${isFullyRepaid ? ' — FULLY REPAID' : ''}`,
      });

    const remainingAfter = Math.max(0, remaining - actualRepayUsd);

    res.json({
      status: 'success',
      message: isFullyRepaid
        ? 'Loan fully repaid! Your Vimbiso Score will improve.'
        : `Payment received. ZiG ${Math.round(remainingAfter * rate * 100) / 100} remaining.`,
      repayment: {
        paid_zig: actualRepayZig,
        paid_usd: actualRepayUsd,
        remaining_zig: Math.round(remainingAfter * rate * 100) / 100,
        remaining_usd: Math.round(remainingAfter * 100) / 100,
        fully_repaid: isFullyRepaid,
        progress_pct: Math.round((newAmountRepaid / totalRepayment) * 100),
      },
      vimbiso_impact: isFullyRepaid
        ? 'On-time repayment adds +10 points to your Vimbiso Score'
        : 'Keep repaying to protect your Vimbiso Score',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;