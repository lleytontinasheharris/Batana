// backend/src/routes/investRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const exchangeService = require('../services/exchangeService');
const { requireAuth } = require('../middleware/auth');

// ── HELPERS ────────────────────────────────────────────────
function riskColor(level) {
  switch (level) {
    case 'low':    return '#748c3d';
    case 'medium': return '#d97706';
    case 'high':   return '#dc2626';
    default:       return '#78716c';
  }
}

function poolStatusLabel(status) {
  switch (status) {
    case 'open':     return 'Open for Investment';
    case 'funded':   return 'Fully Funded';
    case 'active':   return 'Active — Growing';
    case 'repaying': return 'Repaying Investors';
    case 'complete': return 'Completed';
    case 'default':  return 'Defaulted';
    default:         return status;
  }
}

// Enrich a single pool with farmer + contribution data
async function enrichPool(pool, userId = null) {
  const rates = exchangeService.getExchangeRates();
  const rate  = rates.official_rate;

  // Get farmer
  let farmer = null;
  if (pool.farmer_id) {
    const { data } = await supabase
      .from('farmers')
      .select(
        'id, full_name, province, district, primary_activity, ' +
        'farm_size_hectares, land_ownership, verification, ' +
        'gmb_supplier_number, zfu_membership_number, max_funding_usd'
      )
      .eq('id', pool.farmer_id)
      .single();
    farmer = data;
  }

  // Contribution totals
  const { data: contribs } = await supabase
    .from('pool_contributions')
    .select('amount_usd')
    .eq('pool_id', pool.id);

  const totalRaisedUsd = (contribs || []).reduce(
    (sum, c) => sum + parseFloat(c.amount_usd || 0), 0
  );
  const totalRaisedZig  = Math.round(totalRaisedUsd * rate * 100) / 100;
  const targetUsd       = parseFloat(pool.target_amount_usd || 0);
  const fundedPct       = targetUsd > 0
    ? Math.min(100, Math.round((totalRaisedUsd / targetUsd) * 100))
    : 0;
  const remainingUsd    = Math.max(0, targetUsd - totalRaisedUsd);
  const contributorCount = (contribs || []).length;

  // User's own contribution if logged in
  let myContribution = null;
  if (userId) {
    const { data: mine } = await supabase
      .from('pool_contributions')
      .select('amount_usd, contributed_at, expected_return_usd')
      .eq('pool_id', pool.id)
      .eq('user_id', userId);

    if (mine && mine.length > 0) {
      const myTotalUsd = mine.reduce(
        (s, c) => s + parseFloat(c.amount_usd || 0), 0
      );
      const myTotalZig = Math.round(myTotalUsd * rate * 100) / 100;
      const myReturnUsd = mine.reduce(
        (s, c) => s + parseFloat(c.expected_return_usd || 0), 0
      );
      myContribution = {
        total_invested_usd: Math.round(myTotalUsd * 100) / 100,
        total_invested_zig: myTotalZig,
        expected_return_usd: Math.round(myReturnUsd * 100) / 100,
        expected_return_zig: Math.round(myReturnUsd * rate * 100) / 100,
        contributions: mine,
      };
    }
  }

  // Repayment progress
  const { data: repayments } = await supabase
    .from('pool_repayments')
    .select('amount_usd')
    .eq('pool_id', pool.id);

  const totalRepaidUsd = (repayments || []).reduce(
    (s, r) => s + parseFloat(r.amount_usd || 0), 0
  );

  return {
    id: pool.id,
    name: pool.name,
    description: pool.description,
    category: pool.category,
    status: pool.status,
    status_label: poolStatusLabel(pool.status),
    risk_level: pool.risk_level,
    expected_return_pct: pool.expected_return_pct,
    cycle_days: pool.cycle_days,
    insurance_trigger: pool.insurance_trigger,
    notes: pool.notes,
    created_at: pool.created_at,
    // Financials
    target_usd: targetUsd,
    target_zig: Math.round(targetUsd * rate * 100) / 100,
    total_raised_usd: Math.round(totalRaisedUsd * 100) / 100,
    total_raised_zig: totalRaisedZig,
    remaining_usd: Math.round(remainingUsd * 100) / 100,
    funded_pct: fundedPct,
    contributor_count: contributorCount,
    total_repaid_usd: Math.round(totalRepaidUsd * 100) / 100,
    // Farmer
    farmer,
    // User's stake
    my_contribution: myContribution,
    rate_used: rate,
  };
}

// ── GET /api/invest/pools ──────────────────────────────────
// All pools — open ones first
router.get('/pools', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category, status } = req.query;

    let query = supabase
      .from('investment_pools')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (status)   query = query.eq('status', status);

    const { data: pools, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const enriched = await Promise.all(
      (pools || []).map((p) => enrichPool(p, userId))
    );

    // Sort: open first, then funded/active, then complete/default
    const order = ['open', 'funded', 'active', 'repaying', 'complete', 'default'];
    enriched.sort(
      (a, b) => order.indexOf(a.status) - order.indexOf(b.status)
    );

    const rates = exchangeService.getExchangeRates();

    res.json({
      status: 'success',
      pools: enriched,
      total: enriched.length,
      open_count: enriched.filter((p) => p.status === 'open').length,
      total_available_usd: enriched
        .filter((p) => p.status === 'open')
        .reduce((s, p) => s + p.remaining_usd, 0),
      rate_used: rates.official_rate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/invest/pools/:id ──────────────────────────────
// Single pool with full detail
router.get('/pools/:id', requireAuth, async (req, res) => {
  try {
    const userId  = req.user.userId;
    const { id }  = req.params;

    const { data: pool, error } = await supabase
      .from('investment_pools')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !pool) {
      return res.status(404).json({ error: 'Investment pool not found' });
    }

    const enriched = await enrichPool(pool, userId);

    // Get all contributors (anonymised — just count + amounts)
    const { data: contribs } = await supabase
      .from('pool_contributions')
      .select('amount_usd, contributed_at')
      .eq('pool_id', id)
      .order('contributed_at', { ascending: false });

    res.json({
      status: 'success',
      pool: {
        ...enriched,
        recent_contributions: (contribs || []).slice(0, 5).map((c) => ({
          amount_usd: parseFloat(c.amount_usd),
          contributed_at: c.contributed_at,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/invest/contribute ────────────────────────────
// Invest in a pool — deducts from ZiG wallet
router.post('/contribute', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { pool_id, amount_usd } = req.body;

    // Validate
    if (!pool_id) {
      return res.status(400).json({ error: 'pool_id is required' });
    }
    if (!amount_usd || isNaN(parseFloat(amount_usd)) || parseFloat(amount_usd) <= 0) {
      return res.status(400).json({ error: 'Valid investment amount is required' });
    }

    const amountUsd = parseFloat(amount_usd);
    const rates     = exchangeService.getExchangeRates();
    const rate      = rates.official_rate;
    const amountZig = Math.round(amountUsd * rate * 100) / 100;

    // Minimum investment US$5
    if (amountUsd < 5) {
      return res.status(400).json({
        error: 'Minimum investment is US$5 (ZiG ' +
          Math.round(5 * rate) + ')',
      });
    }

    // Get pool
    const { data: pool, error: poolError } = await supabase
      .from('investment_pools')
      .select('*')
      .eq('id', pool_id)
      .single();

    if (poolError || !pool) {
      return res.status(404).json({ error: 'Investment pool not found' });
    }

    if (pool.status !== 'open') {
      return res.status(400).json({
        error: `This pool is not open for investment (status: ${pool.status})`,
        message: poolStatusLabel(pool.status),
      });
    }

    // Check how much is still needed
    const { data: existing } = await supabase
      .from('pool_contributions')
      .select('amount_usd')
      .eq('pool_id', pool_id);

    const alreadyRaised = (existing || []).reduce(
      (s, c) => s + parseFloat(c.amount_usd || 0), 0
    );
    const remaining = parseFloat(pool.target_amount_usd) - alreadyRaised;

    if (amountUsd > remaining) {
      return res.status(400).json({
        error: `Only US$${Math.round(remaining * 100) / 100} remaining in this pool. ` +
          `Invest US$${Math.round(remaining * 100) / 100} or less.`,
      });
    }

    // Check wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('zig_balance')
      .eq('user_id', userId)
      .single();

    if (!wallet || parseFloat(wallet.zig_balance) < amountZig) {
      return res.status(400).json({
        error: `Insufficient balance. Need ZiG ${amountZig.toLocaleString()} ` +
          `but have ZiG ${parseFloat(wallet?.zig_balance || 0).toLocaleString()}`,
      });
    }

    // Calculate expected return
    const returnRate       = parseFloat(pool.expected_return_pct) / 100;
    const expectedReturnUsd = Math.round(amountUsd * (1 + returnRate) * 100) / 100;
    const expectedReturnZig = Math.round(expectedReturnUsd * rate * 100) / 100;
    const profitUsd         = Math.round(amountUsd * returnRate * 100) / 100;

    // Deduct from wallet
    await supabase
      .from('wallets')
      .update({
        zig_balance: parseFloat(wallet.zig_balance) - amountZig,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Record contribution
    const { data: contribution, error: contribError } = await supabase
      .from('pool_contributions')
      .insert({
        pool_id,
        user_id: userId,
        amount_usd: amountUsd,
        amount_zig: amountZig,
        expected_return_usd: expectedReturnUsd,
        expected_return_zig: expectedReturnZig,
        contributed_at: new Date().toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (contribError) {
      // Refund wallet on failure
      await supabase
        .from('wallets')
        .update({
          zig_balance: parseFloat(wallet.zig_balance),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      return res.status(500).json({ error: contribError.message });
    }

    // Record transaction
    await supabase
      .from('transactions')
      .insert({
        from_user_id: userId,
        type: 'investment',
        amount: amountZig,
        currency: 'ZiG',
        status: 'completed',
        description: `Investment in: ${pool.name}`,
      });

    // Check if pool is now fully funded — update status
    const newTotal = alreadyRaised + amountUsd;
    if (newTotal >= parseFloat(pool.target_amount_usd)) {
      await supabase
        .from('investment_pools')
        .update({ status: 'funded' })
        .eq('id', pool_id);
    }

    // Maturity date
    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + parseInt(pool.cycle_days));

    res.status(201).json({
      status: 'success',
      message: `Investment confirmed. ZiG ${amountZig.toLocaleString()} committed to ${pool.name}`,
      investment: {
        contribution_id: contribution.id,
        pool_id,
        pool_name: pool.name,
        amount_zig: amountZig,
        amount_usd: amountUsd,
        expected_return_zig: expectedReturnZig,
        expected_return_usd: expectedReturnUsd,
        profit_usd: profitUsd,
        return_pct: pool.expected_return_pct,
        cycle_days: pool.cycle_days,
        maturity_date: maturityDate.toISOString().split('T')[0],
        maturity_date_formatted: maturityDate.toLocaleDateString('en-GB'),
      },
      pool_status: newTotal >= parseFloat(pool.target_amount_usd)
        ? 'funded'
        : 'open',
      pool_funded_pct: Math.min(
        100,
        Math.round((newTotal / parseFloat(pool.target_amount_usd)) * 100)
      ),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/invest/my-investments ────────────────────────
// User's full investment portfolio
router.get('/my-investments', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rates  = exchangeService.getExchangeRates();
    const rate   = rates.official_rate;

    const { data: contribs, error } = await supabase
      .from('pool_contributions')
      .select('*')
      .eq('user_id', userId)
      .order('contributed_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Group by pool
    const poolMap = {};
    for (const c of contribs || []) {
      if (!poolMap[c.pool_id]) poolMap[c.pool_id] = [];
      poolMap[c.pool_id].push(c);
    }

    // Enrich each pool group
    const investments = await Promise.all(
      Object.entries(poolMap).map(async ([poolId, poolContribs]) => {
        const { data: pool } = await supabase
          .from('investment_pools')
          .select(
            'id, name, category, status, expected_return_pct, ' +
            'cycle_days, risk_level, farmer_id'
          )
          .eq('id', poolId)
          .single();

        let farmerName = null;
        if (pool?.farmer_id) {
          const { data: farmer } = await supabase
            .from('farmers')
            .select('full_name, primary_activity, province')
            .eq('id', pool.farmer_id)
            .single();
          farmerName = farmer
            ? `${farmer.full_name} · ${farmer.primary_activity}`
            : null;
        }

        const totalInvestedUsd = poolContribs.reduce(
          (s, c) => s + parseFloat(c.amount_usd || 0), 0
        );
        const totalInvestedZig = Math.round(totalInvestedUsd * rate * 100) / 100;
        const totalExpectedUsd = poolContribs.reduce(
          (s, c) => s + parseFloat(c.expected_return_usd || 0), 0
        );
        const totalExpectedZig = Math.round(totalExpectedUsd * rate * 100) / 100;
        const profitUsd = Math.round(
          (totalExpectedUsd - totalInvestedUsd) * 100
        ) / 100;

        // Check repayments received for this user + pool
        const { data: repayments } = await supabase
          .from('pool_repayments')
          .select('amount_usd')
          .eq('pool_id', poolId)
          .eq('user_id', userId);

        const receivedUsd = (repayments || []).reduce(
          (s, r) => s + parseFloat(r.amount_usd || 0), 0
        );

        const maturityDate = new Date(poolContribs[0].contributed_at);
        maturityDate.setDate(
          maturityDate.getDate() + parseInt(pool?.cycle_days || 90)
        );

        return {
          pool_id: poolId,
          pool_name: pool?.name || 'Unknown Pool',
          pool_status: pool?.status || 'unknown',
          pool_status_label: poolStatusLabel(pool?.status),
          category: pool?.category,
          risk_level: pool?.risk_level,
          expected_return_pct: pool?.expected_return_pct,
          farmer: farmerName,
          total_invested_usd: Math.round(totalInvestedUsd * 100) / 100,
          total_invested_zig: totalInvestedZig,
          expected_return_usd: Math.round(totalExpectedUsd * 100) / 100,
          expected_return_zig: totalExpectedZig,
          profit_usd: profitUsd,
          profit_zig: Math.round(profitUsd * rate * 100) / 100,
          received_usd: Math.round(receivedUsd * 100) / 100,
          maturity_date: maturityDate.toISOString().split('T')[0],
          maturity_date_formatted: maturityDate.toLocaleDateString('en-GB'),
          first_invested: poolContribs[poolContribs.length - 1].contributed_at,
        };
      })
    );

    // Portfolio totals
    const totalInvestedUsd = investments.reduce(
      (s, i) => s + i.total_invested_usd, 0
    );
    const totalExpectedUsd = investments.reduce(
      (s, i) => s + i.expected_return_usd, 0
    );
    const totalProfitUsd   = investments.reduce(
      (s, i) => s + i.profit_usd, 0
    );
    const totalReceivedUsd = investments.reduce(
      (s, i) => s + i.received_usd, 0
    );

    res.json({
      status: 'success',
      portfolio: {
        total_invested_usd: Math.round(totalInvestedUsd * 100) / 100,
        total_invested_zig: Math.round(totalInvestedUsd * rate * 100) / 100,
        total_expected_usd: Math.round(totalExpectedUsd * 100) / 100,
        total_expected_zig: Math.round(totalExpectedUsd * rate * 100) / 100,
        total_profit_usd: Math.round(totalProfitUsd * 100) / 100,
        total_received_usd: Math.round(totalReceivedUsd * 100) / 100,
        active_pools: investments.filter(
          (i) => ['open', 'funded', 'active', 'repaying'].includes(i.pool_status)
        ).length,
        completed_pools: investments.filter(
          (i) => i.pool_status === 'complete'
        ).length,
      },
      investments,
      rate_used: rate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;