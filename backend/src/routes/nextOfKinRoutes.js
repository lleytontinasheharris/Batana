// backend/src/routes/nextOfKinRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/kin/my-kin ────────────────────────────────────
// List all next of kin for the logged-in user
router.get('/my-kin', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data, error } = await supabase
      .from('next_of_kin')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      status: 'success',
      kin: data || [],
      count: (data || []).length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/kin/add ──────────────────────────────────────
// Add a new next of kin
router.post('/add', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { full_name, relationship, phone_number, national_id, is_primary } = req.body;

    // Validate required fields
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!relationship || !relationship.trim()) {
      return res.status(400).json({ error: 'Relationship is required' });
    }
    if (!phone_number || !phone_number.trim()) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    if (!national_id || !national_id.trim()) {
      return res.status(400).json({ error: 'National ID is required' });
    }

    // Validate phone format (Zimbabwe: 07XXXXXXXX or +2637XXXXXXXX)
    const phoneClean = phone_number.replace(/\s/g, '');
    const phoneValid = /^(07\d{8}|\+2637\d{8}|07\d{7})$/.test(phoneClean);
    if (!phoneValid) {
      return res.status(400).json({
        error: 'Invalid phone number. Use format: 07XXXXXXXX',
      });
    }

    // Check user doesn't already have 3 kin (reasonable limit)
    const { data: existing } = await supabase
      .from('next_of_kin')
      .select('id')
      .eq('user_id', userId);

    if (existing && existing.length >= 3) {
      return res.status(400).json({
        error: 'Maximum 3 next of kin allowed. Remove one before adding another.',
      });
    }

    // If marking as primary, unset any existing primary
    if (is_primary) {
      await supabase
        .from('next_of_kin')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true);
    }

    // If this is the first kin, auto-set as primary
    const shouldBePrimary = is_primary || !existing || existing.length === 0;

    const { data: kin, error: insertError } = await supabase
      .from('next_of_kin')
      .insert({
        user_id: userId,
        full_name: full_name.trim(),
        relationship: relationship.trim().toLowerCase(),
        phone_number: phoneClean,
        national_id: national_id.trim().toUpperCase(),
        is_primary: shouldBePrimary,
      })
      .select()
      .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    res.status(201).json({
      status: 'success',
      message: `${full_name} added as next of kin`,
      kin,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/kin/:id ───────────────────────────────────────
// Update a next of kin record
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { full_name, relationship, phone_number, national_id, is_primary } = req.body;

    // Confirm this kin belongs to this user
    const { data: existing } = await supabase
      .from('next_of_kin')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Next of kin record not found' });
    }

    // Validate phone if provided
    if (phone_number) {
      const phoneClean = phone_number.replace(/\s/g, '');
      const phoneValid = /^(07\d{8}|\+2637\d{8}|07\d{7})$/.test(phoneClean);
      if (!phoneValid) {
        return res.status(400).json({
          error: 'Invalid phone number. Use format: 07XXXXXXXX',
        });
      }
    }

    // If marking as primary, unset others
    if (is_primary) {
      await supabase
        .from('next_of_kin')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true)
        .neq('id', id);
    }

    const updates = {};
    if (full_name) updates.full_name = full_name.trim();
    if (relationship) updates.relationship = relationship.trim().toLowerCase();
    if (phone_number) updates.phone_number = phone_number.replace(/\s/g, '');
    if (national_id) updates.national_id = national_id.trim().toUpperCase();
    if (is_primary !== undefined) updates.is_primary = is_primary;
    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('next_of_kin')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      status: 'success',
      message: 'Next of kin updated',
      kin: updated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/kin/:id ────────────────────────────────────
// Remove a next of kin
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Confirm ownership
    const { data: kin } = await supabase
      .from('next_of_kin')
      .select('id, is_primary, full_name')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!kin) {
      return res.status(404).json({ error: 'Next of kin record not found' });
    }

    await supabase
      .from('next_of_kin')
      .delete()
      .eq('id', id);

    // If we deleted the primary, promote the next one
    if (kin.is_primary) {
      const { data: remaining } = await supabase
        .from('next_of_kin')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (remaining && remaining.length > 0) {
        await supabase
          .from('next_of_kin')
          .update({ is_primary: true })
          .eq('id', remaining[0].id);
      }
    }

    res.json({
      status: 'success',
      message: `${kin.full_name} removed from next of kin`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;