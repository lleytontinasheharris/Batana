// backend/src/routes/storeRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

// ── HELPER: verify the requesting user is a store attendant ─
async function requireAttendant(req, res, next) {
  try {
    const userId = req.user.userId;

    const { data: user } = await supabase
      .from('users')
      .select('is_store_attendant, role')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Allow store attendants OR admins (admins can do everything)
    if (!user.is_store_attendant && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Store attendant access required',
        message: 'This endpoint is only accessible to authorised BATANA store staff',
      });
    }

    req.attendant = user;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── POST /api/store/lookup ─────────────────────────────────
// Attendant enters verification code → sees loan + user details
// Does NOT expose amounts (attendant only needs to verify identity)
router.post('/lookup', requireAuth, requireAttendant, async (req, res) => {
  try {
    const { verification_code } = req.body;

    if (!verification_code || !verification_code.trim()) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const code = verification_code.trim().toUpperCase();

    // Validate format: BAT-XXXXXX
    if (!/^BAT-[A-Z0-9]{6}$/.test(code)) {
      return res.status(400).json({
        error: 'Invalid code format. Codes look like: BAT-4X9K2M',
      });
    }

    // Find the loan by verification code
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        status,
        verification_code,
        applied_at,
        purpose,
        vimbiso_score_at_application,
        requires_store_visit,
        user_id
      `)
      .eq('verification_code', code)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({
        error: 'Code not found. Check the code and try again.',
      });
    }

    // Check store_verifications for expiry
    const { data: storeVerif } = await supabase
      .from('store_verifications')
      .select('expires_at, verified_at')
      .eq('loan_id', loan.id)
      .single();

    if (storeVerif?.verified_at) {
      return res.status(400).json({
        error: 'This code has already been used. Identity was verified on ' +
          new Date(storeVerif.verified_at).toLocaleDateString('en-GB'),
      });
    }

    if (storeVerif?.expires_at && new Date(storeVerif.expires_at) < new Date()) {
      return res.status(400).json({
        error: 'This verification code has expired. The customer must apply again.',
      });
    }

    // Check loan is in correct status
    if (loan.status !== 'pending_store') {
      const statusMessages = {
        pending_admin: 'This loan has already been verified and is awaiting admin approval.',
        disbursed: 'This loan has already been approved and disbursed.',
        completed: 'This loan has already been repaid.',
        rejected: 'This loan application was rejected.',
      };
      return res.status(400).json({
        error: statusMessages[loan.status] ||
          `This loan cannot be verified at this stage (status: ${loan.status})`,
      });
    }

    // Get user details — ONLY what attendant needs for identity check
    const { data: user } = await supabase
      .from('users')
      .select('first_name, last_name, phone_number, national_id')
      .eq('id', loan.user_id)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'Customer record not found' });
    }

    // Get verification record for photo (if submitted)
    const { data: verificationRecord } = await supabase
      .from('verifications')
      .select('passport_photo_base64, document_type, document_number, status')
      .eq('user_id', loan.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get next of kin snapshot from loan
    const { data: loanFull } = await supabase
      .from('loans')
      .select('next_of_kin_snapshot')
      .eq('id', loan.id)
      .single();

    res.json({
      status: 'success',
      message: 'Customer found. Verify their physical ID matches the details below.',
      loan_id: loan.id,
      verification_code: code,
      applied_at: loan.applied_at,
      purpose: loan.purpose,

      // Identity fields for physical check
      customer: {
        full_name: `${user.first_name} ${user.last_name}`,
        phone_number: user.phone_number,
        national_id: user.national_id || verificationRecord?.document_number || 'Not on file',
        photo_base64: verificationRecord?.passport_photo_base64 || null,
        id_verified_previously: verificationRecord?.status === 'approved',
      },

      next_of_kin: loanFull?.next_of_kin_snapshot || null,

      instructions: [
        'Ask the customer to show their physical National ID or Passport',
        'Confirm the name matches: ' + `${user.first_name} ${user.last_name}`,
        'Confirm the ID number matches what is on file',
        'If everything checks out, click Confirm Identity',
        'Do NOT approve if there is any doubt — reject and ask them to visit a ZB Bank branch',
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/store/confirm ────────────────────────────────
// Attendant confirms identity → loan moves to pending_admin
router.post('/confirm', requireAuth, requireAttendant, async (req, res) => {
  try {
    const attendantId = req.user.userId;
    const { loan_id, verification_code, notes } = req.body;

    if (!loan_id) {
      return res.status(400).json({ error: 'loan_id is required' });
    }
    if (!verification_code) {
      return res.status(400).json({ error: 'verification_code is required' });
    }

    const code = verification_code.trim().toUpperCase();

    // Fetch loan and confirm it belongs to this code + is pending_store
    const { data: loan } = await supabase
      .from('loans')
      .select('id, status, verification_code, user_id, amount_usd')
      .eq('id', loan_id)
      .single();

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Security: code must match
    if (loan.verification_code !== code) {
      return res.status(400).json({
        error: 'Verification code does not match this loan',
      });
    }

    if (loan.status !== 'pending_store') {
      return res.status(400).json({
        error: `This loan is not awaiting store verification (current status: ${loan.status})`,
      });
    }

    const now = new Date().toISOString();

    // Update loan status → pending_admin
    const { error: loanUpdateError } = await supabase
      .from('loans')
      .update({
        status: 'pending_admin',
        store_verified_at: now,
        store_attendant_id: attendantId,
      })
      .eq('id', loan_id);

    if (loanUpdateError) {
      return res.status(500).json({ error: loanUpdateError.message });
    }

    // Update store_verifications record
    await supabase
      .from('store_verifications')
      .update({
        attendant_id: attendantId,
        verified_at: now,
        notes: notes || null,
      })
      .eq('loan_id', loan_id);

    // Get customer name for response
    const { data: customer } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', loan.user_id)
      .single();

    res.json({
      status: 'success',
      message: `Identity confirmed for ${customer?.first_name} ${customer?.last_name}. Loan is now awaiting admin approval.`,
      loan_id: loan.id,
      new_status: 'pending_admin',
      verified_at: now,
      next: 'Admin will review and approve the loan. Customer will be notified.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/store/reject ─────────────────────────────────
// Attendant rejects — ID did not match
router.post('/reject', requireAuth, requireAttendant, async (req, res) => {
  try {
    const attendantId = req.user.userId;
    const { loan_id, verification_code, reason } = req.body;

    if (!loan_id || !verification_code) {
      return res.status(400).json({ error: 'loan_id and verification_code are required' });
    }

    const code = verification_code.trim().toUpperCase();

    const { data: loan } = await supabase
      .from('loans')
      .select('id, status, verification_code, user_id')
      .eq('id', loan_id)
      .single();

    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.verification_code !== code) {
      return res.status(400).json({ error: 'Verification code does not match' });
    }
    if (loan.status !== 'pending_store') {
      return res.status(400).json({
        error: `Cannot reject — loan status is: ${loan.status}`,
      });
    }

    const now = new Date().toISOString();

    await supabase
      .from('loans')
      .update({
        status: 'rejected',
        store_verified_at: now,
        store_attendant_id: attendantId,
        admin_note: `Store rejection: ${reason || 'Identity could not be verified'}`,
      })
      .eq('id', loan_id);

    await supabase
      .from('store_verifications')
      .update({
        attendant_id: attendantId,
        verified_at: now,
        notes: `REJECTED: ${reason || 'Identity could not be verified'}`,
      })
      .eq('loan_id', loan_id);

    res.json({
      status: 'success',
      message: 'Loan application rejected at store verification stage.',
      loan_id: loan.id,
      new_status: 'rejected',
      reason: reason || 'Identity could not be verified',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/store/pending ─────────────────────────────────
// Attendant sees all loans currently awaiting store verification
// Useful for a store dashboard — shows what codes to expect today
router.get('/pending', requireAuth, requireAttendant, async (req, res) => {
  try {
    const { data: loans, error } = await supabase
      .from('loans')
      .select(`
        id,
        verification_code,
        applied_at,
        purpose,
        vimbiso_score_at_application,
        user_id
      `)
      .eq('status', 'pending_store')
      .order('applied_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Get user names (no amounts — attendant doesn't need them)
    const enriched = await Promise.all(
      (loans || []).map(async (loan) => {
        const { data: user } = await supabase
          .from('users')
          .select('first_name, last_name, phone_number')
          .eq('id', loan.user_id)
          .single();

        // Check expiry
        const { data: sv } = await supabase
          .from('store_verifications')
          .select('expires_at')
          .eq('loan_id', loan.id)
          .single();

        const isExpired = sv?.expires_at && new Date(sv.expires_at) < new Date();

        return {
          loan_id: loan.id,
          verification_code: loan.verification_code,
          applied_at: loan.applied_at,
          purpose: loan.purpose,
          customer_name: user
            ? `${user.first_name} ${user.last_name}`
            : 'Unknown',
          phone_number: user?.phone_number || '—',
          expires_at: sv?.expires_at || null,
          is_expired: isExpired,
        };
      })
    );

    res.json({
      status: 'success',
      pending_count: enriched.length,
      loans: enriched.filter((l) => !l.is_expired),
      expired_count: enriched.filter((l) => l.is_expired).length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;