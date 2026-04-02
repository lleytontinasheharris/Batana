// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { generateToken, requireAuth, loginLimiter, registrationLimiter } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validate');

// Hash PIN with bcrypt (much stronger than SHA256)
async function hashPin(pin) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(pin, salt);
}

// Compare PIN with stored hash
async function comparePin(pin, hash) {
    return bcrypt.compare(pin, hash);
}

// POST /api/users/register
router.post('/register', registrationLimiter, validateRegistration, async (req, res) => {
    try {
        const { phone_number, first_name, last_name, pin, language } = req.body;

        // Check if user already exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('phone_number', phone_number)
            .limit(1);

        if (existing && existing.length > 0) {
            return res.status(409).json({
                error: 'Phone number already registered'
            });
        }

        // Hash PIN with bcrypt
        const pinHash = await hashPin(pin);

        // Create user
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                phone_number,
                first_name: first_name || null,
                last_name: last_name || null,
                language: language || 'en',
                pin_hash: pinHash
            })
            .select()
            .single();

        if (userError) {
            return res.status(500).json({ error: userError.message });
        }

        // Create wallet
        const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .insert({
                user_id: user.id,
                zig_balance: 0,
                usd_balance: 0,
                gold_grams: 0
            })
            .select()
            .single();

        if (walletError) {
            return res.status(500).json({ error: walletError.message });
        }

        // Create initial credit score
        await supabase
            .from('credit_scores')
            .insert({
                user_id: user.id,
                score: 0,
                factors: {
                    mukando_history: 0,
                    mukando_duration: 0,
                    savings_consistency: 0,
                    savings_growth: 0,
                    transaction_activity: 0,
                    insurance_premiums: 0,
                    loan_repayment: 5,
                    community_verification: 0
                },
                max_loan_amount_usd: 0
            });

        // Generate JWT token
        const token = generateToken(user.id, user.phone_number);

        res.status(201).json({
            status: 'success',
            message: `Welcome to BATANA, ${first_name || 'user'}!`,
            token: token,
            user: {
                id: user.id,
                phone_number: user.phone_number,
                first_name: user.first_name,
                last_name: user.last_name,
                language: user.language
            },
            wallet: {
                id: wallet.id,
                zig_balance: wallet.zig_balance,
                usd_balance: wallet.usd_balance,
                gold_grams: wallet.gold_grams
            },
            vimbiso_score: 0,
            next_steps: [
                'Deposit funds to your wallet',
                'Join or create a mukando group',
                'Start saving in gold-grams'
            ]
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/users/login
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
    try {
        const { phone_number, pin } = req.body;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone_number', phone_number)
            .single();

        if (error || !user) {
            // Don't reveal whether phone exists or PIN is wrong
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Compare PIN with bcrypt
        let pinMatch = false;
        
        // Handle both old SHA256 hashes and new bcrypt hashes
        if (user.pin_hash.startsWith('$2')) {
            // Bcrypt hash
            pinMatch = await comparePin(pin, user.pin_hash);
        } else {
            // Old SHA256 hash - compare and upgrade
            const crypto = require('crypto');
            const sha256Hash = crypto.createHash('sha256').update(pin).digest('hex');
            pinMatch = sha256Hash === user.pin_hash;
            
            // Upgrade to bcrypt if match
            if (pinMatch) {
                const newHash = await hashPin(pin);
                await supabase
                    .from('users')
                    .update({ pin_hash: newHash })
                    .eq('id', user.id);
            }
        }

        if (!pinMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get wallet
        const { data: wallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Get credit score
        const { data: score } = await supabase
            .from('credit_scores')
            .select('*')
            .eq('user_id', user.id)
            .order('calculated_at', { ascending: false })
            .limit(1)
            .single();

        // Generate JWT token
        const token = generateToken(user.id, user.phone_number);

        res.json({
            status: 'success',
            message: `Welcome back, ${user.first_name || 'user'}!`,
            token: token,
            user: {
                id: user.id,
                phone_number: user.phone_number,
                first_name: user.first_name,
                last_name: user.last_name,
                language: user.language
            },
            wallet: wallet ? {
                zig_balance: wallet.zig_balance,
                usd_balance: wallet.usd_balance,
                gold_grams: wallet.gold_grams
            } : null,
            vimbiso_score: score ? score.score : 0
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users/profile (protected route)
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.user.userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { data: wallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const { data: score } = await supabase
            .from('credit_scores')
            .select('*')
            .eq('user_id', user.id)
            .order('calculated_at', { ascending: false })
            .limit(1)
            .single();

        res.json({
            user: {
                id: user.id,
                phone_number: user.phone_number,
                first_name: user.first_name,
                last_name: user.last_name,
                province: user.province,
                language: user.language,
                member_since: user.created_at
            },
            wallet: wallet ? {
                zig_balance: wallet.zig_balance,
                usd_balance: wallet.usd_balance,
                gold_grams: wallet.gold_grams
            } : null,
            vimbiso_score: score ? {
                score: score.score,
                factors: score.factors,
                max_loan: score.max_loan_amount_usd
            } : null
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users/:id (keep for backward compatibility but less data exposed)
router.get('/:id', async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, first_name, last_name, province, language, created_at')
            .eq('id', req.params.id)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Don't expose wallet or sensitive data without auth
        res.json({
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                member_since: user.created_at
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;