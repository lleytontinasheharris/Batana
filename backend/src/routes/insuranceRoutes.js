// backend/src/routes/insuranceRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const exchangeService = require('../services/exchangeService');
const { requireAuth } = require('../middleware/auth');

// ── PLANS CONFIG ───────────────────────────────────────────
const PLANS = {
  nhaka_basic: {
    id: 'nhaka_basic',
    name: 'Nhaka Basic',
    type: 'funeral',
    cover_usd: 500,
    premium_usd: 2,
    description: 'Funeral cover for you and immediate family',
    features: [
      'Payout within 48 hours of claim',
      'Covers policyholder only',
      'No medical exam required',
      'Claim via USSD or app',
    ],
  },
  nhaka_family: {
    id: 'nhaka_family',
    name: 'Nhaka Family',
    type: 'funeral',
    cover_usd: 1000,
    premium_usd: 5,
    description: 'Extended funeral cover for the whole family',
    features: [
      'Payout within 48 hours of claim',
      'Covers policyholder + spouse + 4 children',
      'No medical exam required',
      'Grief-sensitive claims processing',
    ],
  },
  nhaka_premium: {
    id: 'nhaka_premium',
    name: 'Nhaka Premium',
    type: 'funeral',
    cover_usd: 2000,
    premium_usd: 8,
    description: 'Maximum funeral cover for extended family',
    features: [
      'Payout within 48 hours of claim',
      'Covers policyholder + spouse + children + parents',
      'No medical exam required',
      'Priority claims processing',
    ],
  },
  maruva: {
    id: 'maruva',
    name: 'Maruva Hospital Cash',
    type: 'hospital',
    cover_usd: 10,
    premium_usd: 3,
    description: 'Daily cash while you are in hospital',
    features: [
      'ZiG cash paid from day 1',
      'Up to 30 days per year',
      'No receipts needed - just admission proof',
      'Works at any registered hospital',
    ],
  },
};

// Helper — enrich plan with live ZiG amounts
function enrichPlan(plan) {
  const rates = exchangeService.getExchangeRates();
  const rate = rates.official_rate;
  return {
    ...plan,
    premium_zig: Math.round(plan.premium_usd * rate * 100) / 100,
    cover_zig: Math.round(plan.cover_usd * rate * 100) / 100,
    rate_used: rate,
  };
}

// GET /api/insurance/plans
router.get('/plans', (req, res) => {
  const enriched = Object.values(PLANS).map(enrichPlan);
  res.json({
    status: 'success',
    plans: enriched,
    rate_note: 'ZiG amounts calculated at current RBZ rate and updated daily',
  });
});

// GET /api/insurance/my-policies
router.get('/my-policies', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rates = exchangeService.getExchangeRates();
    const rate = rates.official_rate;

    const { data: policies, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const enriched = (policies || []).map((p) => {
      const plan = PLANS[p.plan_id] || null;
      const coverAmount = parseFloat(p.coverage_amount_usd || p.cover_amount_usd || 0);
      const premiumAmount = parseFloat(p.premium_usd || 0);
      return {
        ...p,
        cover_zig: Math.round(coverAmount * rate * 100) / 100,
        premium_zig: Math.round(premiumAmount * rate * 100) / 100,
        cover_amount_usd: coverAmount,
        plan_details: plan ? enrichPlan(plan) : null,
        rate_used: rate,
      };
    });

    res.json({
      status: 'success',
      policies: enriched,
      active_count: enriched.filter((p) => p.status === 'active').length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/insurance/enroll
router.post('/enroll', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { plan_id } = req.body;

    if (!plan_id || !PLANS[plan_id]) {
      return res.status(400).json({
        error: 'Invalid plan. Choose: nhaka_basic, nhaka_family, nhaka_premium, or maruva',
      });
    }

    const plan = PLANS[plan_id];
    const rates = exchangeService.getExchangeRates();
    const rate = rates.official_rate;
    const premiumZig = Math.round(plan.premium_usd * rate * 100) / 100;

    // Check not already enrolled in same type
    const { data: existing } = await supabase
      .from('insurance_policies')
      .select('id, plan_id, status')
      .eq('user_id', userId)
      .eq('status', 'active');

    const sameType = (existing || []).find(
      (p) => PLANS[p.plan_id]?.type === plan.type
    );

    if (sameType) {
      return res.status(409).json({
        error: `You already have an active ${plan.type} policy. Cancel it first to switch plans.`,
      });
    }

    // Check wallet — prefer ZiG first, fall back to USD
    const { data: wallet } = await supabase
      .from('wallets')
      .select('usd_balance, zig_balance')
      .eq('user_id', userId)
      .single();

    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    const zigBalance = parseFloat(wallet.zig_balance || 0);
    const usdBalance = parseFloat(wallet.usd_balance || 0);

    let deductFromZig = 0;
    let deductFromUsd = 0;

    if (zigBalance >= premiumZig) {
      deductFromZig = premiumZig;
    } else if (usdBalance >= plan.premium_usd) {
      deductFromUsd = plan.premium_usd;
    } else {
      return res.status(400).json({
        error: `Insufficient balance. First premium is ZiG ${premiumZig} (US$${plan.premium_usd}). Your ZiG balance: ZiG ${zigBalance.toFixed(2)}, USD balance: US$${usdBalance.toFixed(2)}`,
      });
    }

    // Deduct premium
    await supabase
      .from('wallets')
      .update({
        zig_balance: zigBalance - deductFromZig,
        usd_balance: usdBalance - deductFromUsd,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Next billing date
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    // Create policy — write to both columns to satisfy NOT NULL on coverage_amount_usd
    const { data: policy, error: policyError } = await supabase
      .from('insurance_policies')
      .insert({
        user_id: userId,
        plan_id: plan_id,
        type: plan.type,
        status: 'active',
        coverage_amount_usd: plan.cover_usd,
        cover_amount_usd: plan.cover_usd,
        premium_usd: plan.premium_usd,
        next_billing_date: nextBilling.toISOString(),
        premiums_paid: 1,
      })
      .select()
      .single();

    if (policyError) return res.status(500).json({ error: policyError.message });

    // Record transaction
    await supabase
      .from('transactions')
      .insert({
        from_user_id: userId,
        type: 'insurance_premium',
        amount: deductFromZig > 0 ? deductFromZig : deductFromUsd,
        currency: deductFromZig > 0 ? 'ZiG' : 'USD',
        status: 'completed',
        description: `${plan.name} first premium`,
      });

    res.status(201).json({
      status: 'success',
      message: `You are now covered by ${plan.name}`,
      policy: {
        id: policy.id,
        plan: plan.name,
        type: plan.type,
        cover_zig: Math.round(plan.cover_usd * rate * 100) / 100,
        cover_usd: plan.cover_usd,
        premium_zig: premiumZig,
        premium_usd: plan.premium_usd,
        status: 'active',
        next_billing: nextBilling.toLocaleDateString('en-GB'),
        premiums_paid: 1,
        paid_with: deductFromZig > 0 ? `ZiG ${premiumZig}` : `US$${plan.premium_usd}`,
      },
      coverage: plan.features,
      vimbiso_impact: 'Active insurance adds +5 points to your Vimbiso Score',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/insurance/cancel/:policyId
router.post('/cancel/:policyId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { policyId } = req.params;

    const { data: policy } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('id', policyId)
      .eq('user_id', userId)
      .single();

    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    if (policy.status !== 'active') {
      return res.status(400).json({ error: 'Policy is not active' });
    }

    await supabase
      .from('insurance_policies')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', policyId);

    res.json({
      status: 'success',
      message: 'Policy cancelled. Coverage ends immediately.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/insurance/claim/:policyId
router.post('/claim/:policyId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { policyId } = req.params;
    const { description, days_hospitalised } = req.body;

    if (!description || description.trim().length < 10) {
      return res.status(400).json({
        error: 'Please provide a description of at least 10 characters',
      });
    }

    const { data: policy } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('id', policyId)
      .eq('user_id', userId)
      .single();

    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    if (policy.status !== 'active') {
      return res.status(400).json({
        error: 'You can only claim on an active policy',
      });
    }

    const rates = exchangeService.getExchangeRates();
    const rate = rates.official_rate;

    // Use correct column name
    const coverAmount = parseFloat(
      policy.coverage_amount_usd || policy.cover_amount_usd || 0
    );

    // Calculate claim amount
    let claimAmountUsd = coverAmount;
    if (policy.type === 'hospital' && days_hospitalised) {
      const days = Math.min(parseInt(days_hospitalised) || 1, 30);
      claimAmountUsd = days * 10;
    }

    const claimAmountZig = Math.round(claimAmountUsd * rate * 100) / 100;

    // Insert claim
    const { data: claim, error: claimError } = await supabase
      .from('insurance_claims')
      .insert({
        policy_id: policyId,
        user_id: userId,
        amount_usd: claimAmountUsd,
        claim_amount_usd: claimAmountUsd,
        type: policy.type,
        status: 'pending',
        days_hospitalised:
          policy.type === 'hospital'
            ? parseInt(days_hospitalised) || null
            : null,
        parametric_data: {
          policy_type: policy.type,
          cover_amount_usd: coverAmount,
          cover_amount_zig: claimAmountZig,
          days_claimed: days_hospitalised || null,
          rate_used: rate,
          description: description.trim(),
        },
      })
      .select()
      .single();

    if (claimError) return res.status(500).json({ error: claimError.message });

    res.status(201).json({
      status: 'success',
      message: 'Claim submitted. Our team will review it within 48 hours.',
      claim: {
        id: claim.id,
        amount_zig: `ZiG ${claimAmountZig.toLocaleString()}`,
        amount_usd: `US$${claimAmountUsd}`,
        status: 'pending',
      },
      note:
        policy.type === 'funeral'
          ? 'We understand this is a difficult time. Your claim will be handled with care and urgency.'
          : 'Hospital cash claims are typically processed within 24 hours.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;