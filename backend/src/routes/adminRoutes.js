// backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const exchangeService = require('../services/exchangeService');
const { requireAuth } = require('../middleware/auth');

// ── HELPER: require admin role ─────────────────────────────
async function requireAdmin(req, res, next) {
  try {
    const userId = req.user.userId;

    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        message: 'This endpoint is restricted to BATANA administrators',
      });
    }

    req.adminUser = user;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ══════════════════════════════════════════════════════════
//  LOAN ADMINISTRATION
// ══════════════════════════════════════════════════════════

// ── GET /api/admin/loans/pending ───────────────────────────
// All loans awaiting admin approval (status = pending_admin)
router.get('/loans/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rates = exchangeService.getExchangeRates();
    const rate = rates.official_rate;

    const { data: loans, error } = await supabase
      .from('loans')
      .select('*')
      .eq('status', 'pending_admin')
      .order('store_verified_at', { ascending: true }); // Oldest first

    if (error) return res.status(500).json({ error: error.message });

    // Enrich with user details
    const enriched = await Promise.all(
      (loans || []).map(async (loan) => {
        const { data: user } = await supabase
          .from('users')
          .select('first_name, last_name, phone_number, national_id, role')
          .eq('id', loan.user_id)
          .single();

        // Get store attendant name
        let attendantName = 'Unknown';
        if (loan.store_attendant_id) {
          const { data: attendant } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', loan.store_attendant_id)
            .single();
          if (attendant) {
            attendantName = `${attendant.first_name} ${attendant.last_name}`;
          }
        }

        // Get insurance info if linked
        let insuranceInfo = null;
        if (loan.linked_insurance_id) {
          const { data: policy } = await supabase
            .from('insurance_policies')
            .select('plan_id, status')
            .eq('id', loan.linked_insurance_id)
            .single();
          insuranceInfo = policy;
        }

        const daysWaiting = loan.store_verified_at
          ? Math.floor(
              (Date.now() - new Date(loan.store_verified_at).getTime()) /
                86400000
            )
          : null;

        return {
          loan_id: loan.id,
          applied_at: loan.applied_at,
          store_verified_at: loan.store_verified_at,
          days_waiting: daysWaiting,
          purpose: loan.purpose,
          amount_usd: loan.amount_usd,
          amount_zig: loan.amount_zig ||
            Math.round(parseFloat(loan.amount_usd) * rate * 100) / 100,
          total_repayment_usd: loan.total_repayment,
          total_repayment_zig:
            Math.round(parseFloat(loan.total_repayment) * rate * 100) / 100,
          interest_rate: loan.interest_rate,
          term_days: loan.term_days,
          due_date: loan.due_date,
          vimbiso_score_at_application: loan.vimbiso_score_at_application,
          insurance_linked: !!loan.linked_insurance_id,
          insurance_info: insuranceInfo,
          next_of_kin: loan.next_of_kin_snapshot || null,
          customer: {
            user_id: loan.user_id,
            full_name: user
              ? `${user.first_name} ${user.last_name}`
              : 'Unknown',
            phone_number: user?.phone_number || '—',
            national_id: user?.national_id || '—',
          },
          store_verification: {
            attendant_name: attendantName,
            attendant_id: loan.store_attendant_id,
            verified_at: loan.store_verified_at,
          },
        };
      })
    );

    res.json({
      status: 'success',
      pending_count: enriched.length,
      loans: enriched,
      rate_used: rate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/loans/all ───────────────────────────────
// Full loan ledger with filters
router.get('/loans/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rates = exchangeService.getExchangeRates();
    const rate = rates.official_rate;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('loans')
      .select('*')
      .order('applied_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) query = query.eq('status', status);

    const { data: loans, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const enriched = await Promise.all(
      (loans || []).map(async (loan) => {
        const { data: user } = await supabase
          .from('users')
          .select('first_name, last_name, phone_number')
          .eq('id', loan.user_id)
          .single();

        const amountRepaid = parseFloat(loan.amount_repaid || 0);
        const totalRepayment = parseFloat(loan.total_repayment || 0);
        const isOverdue =
          ['disbursed', 'active'].includes(loan.status) &&
          new Date(loan.due_date) < new Date();

        return {
          loan_id: loan.id,
          status: loan.status,
          is_overdue: isOverdue,
          applied_at: loan.applied_at,
          disbursed_at: loan.disbursed_at,
          due_date: loan.due_date,
          purpose: loan.purpose,
          amount_usd: loan.amount_usd,
          amount_zig: loan.amount_zig,
          total_repayment_usd: totalRepayment,
          amount_repaid_usd: amountRepaid,
          remaining_usd: Math.max(0, totalRepayment - amountRepaid),
          progress_pct:
            totalRepayment > 0
              ? Math.round((amountRepaid / totalRepayment) * 100)
              : 0,
          vimbiso_score: loan.vimbiso_score_at_application,
          admin_note: loan.admin_note,
          customer: user
            ? `${user.first_name} ${user.last_name} · ${user.phone_number}`
            : 'Unknown',
        };
      })
    );

    // Summary stats
    const allLoans = enriched;
    const totalDisbursed = allLoans
      .filter((l) => ['disbursed', 'active', 'completed'].includes(l.status))
      .reduce((sum, l) => sum + (l.amount_usd || 0), 0);
    const totalRepaid = allLoans.reduce(
      (sum, l) => sum + (l.amount_repaid_usd || 0),
      0
    );
    const overdueCount = allLoans.filter((l) => l.is_overdue).length;

    res.json({
      status: 'success',
      total: enriched.length,
      summary: {
        total_disbursed_usd: Math.round(totalDisbursed * 100) / 100,
        total_repaid_usd: Math.round(totalRepaid * 100) / 100,
        overdue_count: overdueCount,
        pending_admin: enriched.filter((l) => l.status === 'pending_admin')
          .length,
        pending_store: enriched.filter((l) => l.status === 'pending_store')
          .length,
      },
      loans: enriched,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/loans/:id/approve ─────────────────────
// Admin approves → disburse ZiG to wallet
router.post('/loans/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { id } = req.params;
    const { note } = req.body;

    const rates = exchangeService.getExchangeRates();
    const rate = rates.official_rate;

    // Get loan
    const { data: loan } = await supabase
      .from('loans')
      .select('*')
      .eq('id', id)
      .single();

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (loan.status !== 'pending_admin') {
      return res.status(400).json({
        error: `Cannot approve — loan status is: ${loan.status}`,
        message: 'Only loans with status pending_admin can be approved',
      });
    }

    const amountUsd = parseFloat(loan.amount_usd);
    const amountZig = loan.amount_zig ||
      Math.round(amountUsd * rate * 100) / 100;

    const now = new Date().toISOString();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loan.term_days);

    // Update loan → disbursed
    const { error: loanError } = await supabase
      .from('loans')
      .update({
        status: 'disbursed',
        disbursed_at: now,
        due_date: dueDate.toISOString().split('T')[0],
        admin_reviewed_at: now,
        admin_reviewer_id: adminId,
        admin_note: note || 'Approved',
      })
      .eq('id', id);

    if (loanError) return res.status(500).json({ error: loanError.message });

    // Credit wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('zig_balance')
      .eq('user_id', loan.user_id)
      .single();

    if (!wallet) {
      return res.status(404).json({ error: 'Customer wallet not found' });
    }

    await supabase
      .from('wallets')
      .update({
        zig_balance: parseFloat(wallet.zig_balance) + amountZig,
        updated_at: now,
      })
      .eq('user_id', loan.user_id);

    // Record transaction
    await supabase
      .from('transactions')
      .insert({
        to_user_id: loan.user_id,
        type: 'loan_disbursement',
        amount: amountZig,
        currency: 'ZiG',
        status: 'completed',
        description: `Loan approved by admin — ${loan.purpose || 'general'}`,
      });

    // Get customer for response
    const { data: customer } = await supabase
      .from('users')
      .select('first_name, last_name, phone_number')
      .eq('id', loan.user_id)
      .single();

    res.json({
      status: 'success',
      message: `Loan approved. ZiG ${amountZig.toLocaleString()} disbursed to ${customer?.first_name} ${customer?.last_name}'s wallet.`,
      loan_id: id,
      disbursed: {
        amount_zig: amountZig,
        amount_usd: amountUsd,
        due_date: dueDate.toISOString().split('T')[0],
        customer: customer
          ? `${customer.first_name} ${customer.last_name}`
          : 'Unknown',
        phone: customer?.phone_number || '—',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/loans/:id/reject ──────────────────────
// Admin rejects loan with reason
router.post('/loans/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        error: 'A rejection reason is required',
      });
    }

    const { data: loan } = await supabase
      .from('loans')
      .select('id, status, user_id, amount_usd')
      .eq('id', id)
      .single();

    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (!['pending_admin', 'pending_store'].includes(loan.status)) {
      return res.status(400).json({
        error: `Cannot reject — loan status is: ${loan.status}`,
      });
    }

    const now = new Date().toISOString();

    await supabase
      .from('loans')
      .update({
        status: 'rejected',
        admin_reviewed_at: now,
        admin_reviewer_id: adminId,
        admin_note: reason.trim(),
      })
      .eq('id', id);

    const { data: customer } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', loan.user_id)
      .single();

    res.json({
      status: 'success',
      message: `Loan rejected for ${customer?.first_name} ${customer?.last_name}.`,
      loan_id: id,
      reason: reason.trim(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
//  USER VERIFICATION ADMINISTRATION (kept from old adminRoutes)
// ══════════════════════════════════════════════════════════

// ── GET /api/admin/verifications ──────────────────────────
router.get('/verifications', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const { data, error } = await supabase
      .from('verifications')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const enriched = await Promise.all(
      (data || []).map(async (v) => {
        const { data: user } = await supabase
          .from('users')
          .select('first_name, last_name, phone_number')
          .eq('id', v.user_id)
          .single();
        return {
          ...v,
          customer: user
            ? `${user.first_name} ${user.last_name} · ${user.phone_number}`
            : 'Unknown',
        };
      })
    );

    res.json({ status: 'success', verifications: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/verifications/:id/approve ─────────────
router.post(
  '/verifications/:id/approve',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: verif } = await supabase
        .from('verifications')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!verif) return res.status(404).json({ error: 'Verification not found' });

      await supabase
        .from('verifications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: req.user.userId,
        })
        .eq('id', id);

      await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', verif.user_id);

      res.json({ status: 'success', message: 'Verification approved' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/admin/verifications/:id/reject ──────────────
router.post(
  '/verifications/:id/reject',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await supabase
        .from('verifications')
        .update({
          status: 'rejected',
          rejection_reason: reason || 'Does not meet requirements',
          reviewed_at: new Date().toISOString(),
          reviewed_by: req.user.userId,
        })
        .eq('id', id);

      res.json({ status: 'success', message: 'Verification rejected' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/admin/make-admin ─────────────────────────────
// Dev helper — promote self to admin
router.post('/make-admin', requireAuth, async (req, res) => {
  try {
    await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', req.user.userId);

    res.json({
      status: 'success',
      message: 'You are now an admin',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/make-attendant ────────────────────────
// Promote a user to store attendant by phone number
router.post('/make-attendant', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({ error: 'phone_number is required' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('phone_number', phone_number)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found with that phone number' });
    }

    await supabase
      .from('users')
      .update({ is_store_attendant: true })
      .eq('id', user.id);

    res.json({
      status: 'success',
      message: `${user.first_name} ${user.last_name} is now a store attendant`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/dashboard ───────────────────────────────
// High-level stats for admin overview
router.get('/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rates = exchangeService.getExchangeRates();
    const rate = rates.official_rate;

    const [
      { count: totalUsers },
      { count: totalLoans },
      { data: loanStats },
      { count: pendingVerifications },
      { count: activePolicies },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('loans').select('*', { count: 'exact', head: true }),
      supabase
        .from('loans')
        .select('status, amount_usd, amount_repaid, total_repayment'),
      supabase
        .from('verifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('insurance_policies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
    ]);

    const loans = loanStats || [];
    const totalDisbursedUsd = loans
      .filter((l) =>
        ['disbursed', 'active', 'completed'].includes(l.status)
      )
      .reduce((s, l) => s + parseFloat(l.amount_usd || 0), 0);

    const totalRepaidUsd = loans.reduce(
      (s, l) => s + parseFloat(l.amount_repaid || 0),
      0
    );

    const pendingAdmin = loans.filter(
      (l) => l.status === 'pending_admin'
    ).length;
    const pendingStore = loans.filter(
      (l) => l.status === 'pending_store'
    ).length;
    const overdueLoans = loans.filter(
      (l) =>
        ['disbursed', 'active'].includes(l.status) &&
        new Date(l.due_date) < new Date()
    ).length;

    res.json({
      status: 'success',
      dashboard: {
        users: {
          total: totalUsers,
        },
        loans: {
          total: totalLoans,
          pending_store: pendingStore,
          pending_admin: pendingAdmin,
          overdue: overdueLoans,
          total_disbursed_usd: Math.round(totalDisbursedUsd * 100) / 100,
          total_disbursed_zig:
            Math.round(totalDisbursedUsd * rate * 100) / 100,
          total_repaid_usd: Math.round(totalRepaidUsd * 100) / 100,
          repayment_rate_pct:
            totalDisbursedUsd > 0
              ? Math.round((totalRepaidUsd / totalDisbursedUsd) * 100)
              : 0,
        },
        verifications: {
          pending: pendingVerifications,
        },
        insurance: {
          active_policies: activePolicies,
        },
        rate_used: rate,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;