// backend/src/routes/verifyRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

// POST /api/verify/submit
// User submits their ID document for verification
router.post('/submit', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            document_type,
            document_number,
            document_front_base64,
            document_back_base64,
        } = req.body;

        // Validate inputs
        if (!document_type || !['national_id', 'passport'].includes(document_type)) {
            return res.status(400).json({
                error: 'Document type must be national_id or passport'
            });
        }

        if (!document_number || document_number.length < 5) {
            return res.status(400).json({
                error: 'Valid document number is required'
            });
        }

        if (!document_front_base64) {
            return res.status(400).json({
                error: 'Front photo of document is required'
            });
        }

        if (document_type === 'national_id' && !document_back_base64) {
            return res.status(400).json({
                error: 'Back photo is required for National ID'
            });
        }

        // Validate base64 size — max 2MB per image
        const maxBase64Size = 2 * 1024 * 1024 * 1.37; // ~2MB in base64 chars
        if (document_front_base64.length > maxBase64Size) {
            return res.status(400).json({ error: 'Front photo is too large. Max 2MB.' });
        }
        if (document_back_base64 && document_back_base64.length > maxBase64Size) {
            return res.status(400).json({ error: 'Back photo is too large. Max 2MB.' });
        }

        // Check if document number already used by another user
        const { data: existingDoc } = await supabase
            .from('verifications')
            .select('user_id')
            .eq('document_number', document_number.trim().toUpperCase())
            .limit(1);

        if (existingDoc && existingDoc.length > 0 && existingDoc[0].user_id !== userId) {
            return res.status(409).json({
                error: 'This document number is already registered to another account'
            });
        }

        // Check if user already has a pending or approved verification
        const { data: existingVerification } = await supabase
            .from('verifications')
            .select('status')
            .eq('user_id', userId)
            .limit(1);

        if (existingVerification && existingVerification.length > 0) {
            const status = existingVerification[0].status;
            if (status === 'approved') {
                return res.status(409).json({ error: 'Your account is already verified' });
            }
            if (status === 'pending') {
                return res.status(409).json({
                    error: 'You already have a verification pending review'
                });
            }
            // If rejected — allow resubmission (update existing record)
            const { error: updateError } = await supabase
                .from('verifications')
                .update({
                    document_type,
                    document_number: document_number.trim().toUpperCase(),
                    document_front_url: document_front_base64,
                    document_back_url: document_back_base64 || null,
                    status: 'pending',
                    rejection_reason: null,
                    reviewed_by: null,
                    reviewed_at: null,
                    approved_at: null,
                    submitted_at: new Date().toISOString(),
                })
                .eq('user_id', userId);

            if (updateError) {
                return res.status(500).json({ error: updateError.message });
            }
        } else {
            // First-time submission
            const { error: insertError } = await supabase
                .from('verifications')
                .insert({
                    user_id: userId,
                    document_type,
                    document_number: document_number.trim().toUpperCase(),
                    document_front_url: document_front_base64,
                    document_back_url: document_back_base64 || null,
                    status: 'pending',
                });

            if (insertError) {
                return res.status(500).json({ error: insertError.message });
            }
        }

        // Mark user as having submitted verification
        await supabase
            .from('users')
            .update({ verification_submitted: true })
            .eq('id', userId);

        res.json({
            status: 'success',
            message: 'Verification submitted successfully. We will review it within 24 hours.',
            verification_status: 'pending'
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/verify/status
// Check current user's verification status
router.get('/status', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: user } = await supabase
            .from('users')
            .select('is_verified, verification_submitted')
            .eq('id', userId)
            .single();

        const { data: verification } = await supabase
            .from('verifications')
            .select('status, document_type, submitted_at, rejection_reason, approved_at')
            .eq('user_id', userId)
            .single();

        if (!verification) {
            return res.json({
                is_verified: false,
                verification_submitted: false,
                verification_status: 'not_submitted',
                message: 'No verification submitted yet'
            });
        }

        res.json({
            is_verified: user?.is_verified || false,
            verification_submitted: user?.verification_submitted || false,
            verification_status: verification.status,
            document_type: verification.document_type,
            submitted_at: verification.submitted_at,
            approved_at: verification.approved_at,
            rejection_reason: verification.rejection_reason || null,
            message: verification.status === 'pending'
                ? 'Your verification is under review. This usually takes up to 24 hours.'
                : verification.status === 'approved'
                ? 'Your identity has been verified. Full access unlocked.'
                : `Verification rejected: ${verification.rejection_reason || 'Please resubmit with a clearer photo.'}`
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;