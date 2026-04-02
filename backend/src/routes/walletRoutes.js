// backend/src/routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const goldService = require('../services/goldService');
const exchangeService = require('../services/exchangeService');
const { requireAuth, transactionLimiter } = require('../middleware/auth');
const { validateTransaction, validateTransfer } = require('../middleware/validate');

// GET /api/wallet (get authenticated user's wallet)
router.get('/', requireAuth, async (req, res) => {
    try {
        const { data: wallet, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', req.user.userId)
            .single();

        if (error || !wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        const goldPrice = await goldService.fetchGoldPrice();
        const rates = exchangeService.getExchangeRates();

        res.json({
            wallet: {
                zig_balance: wallet.zig_balance,
                usd_balance: wallet.usd_balance,
                gold_grams: wallet.gold_grams,
                gold_value_zig: Math.round(wallet.gold_grams * goldPrice.price_usd_per_gram * rates.official_rate * 100) / 100,
                gold_value_usd: Math.round(wallet.gold_grams * goldPrice.price_usd_per_gram * 100) / 100
            },
            gold_price: {
                per_gram_usd: Math.round(goldPrice.price_usd_per_gram * 100) / 100,
                per_gram_zig: Math.round(goldPrice.price_usd_per_gram * rates.official_rate * 100) / 100
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/wallet/deposit (deposit to authenticated user's wallet)
router.post('/deposit', requireAuth, transactionLimiter, validateTransaction, async (req, res) => {
    try {
        const { amount, currency } = req.body;
        const userId = req.user.userId;

        const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (walletError || !wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        const goldPrice = await goldService.fetchGoldPrice();
        const rates = exchangeService.getExchangeRates();

        let newZigBalance = parseFloat(wallet.zig_balance);
        let newUsdBalance = parseFloat(wallet.usd_balance);
        let newGoldGrams = parseFloat(wallet.gold_grams);
        let goldGramsAdded = 0;

        if (currency === 'USD') {
            newUsdBalance += amount;
            goldGramsAdded = amount / goldPrice.price_usd_per_gram;
        } else {
            newZigBalance += amount;
            const usdEquivalent = amount / rates.official_rate;
            goldGramsAdded = usdEquivalent / goldPrice.price_usd_per_gram;
        }

        newGoldGrams += goldGramsAdded;

        const { data: updated, error: updateError } = await supabase
            .from('wallets')
            .update({
                zig_balance: newZigBalance,
                usd_balance: newUsdBalance,
                gold_grams: newGoldGrams,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ error: updateError.message });
        }

        await supabase
            .from('transactions')
            .insert({
                to_user_id: userId,
                type: 'deposit',
                amount: amount,
                currency: currency || 'ZiG',
                gold_grams_equivalent: goldGramsAdded,
                status: 'completed',
                description: `Deposit of ${currency || 'ZiG'} ${amount}`
            });

        res.json({
            status: 'success',
            message: `Deposited ${currency || 'ZiG'} ${amount}`,
            deposit: {
                amount: amount,
                currency: currency || 'ZiG',
                gold_grams_equivalent: Math.round(goldGramsAdded * 1000000) / 1000000
            },
            wallet: {
                zig_balance: updated.zig_balance,
                usd_balance: updated.usd_balance,
                gold_grams: updated.gold_grams,
                gold_value_usd: Math.round(parseFloat(updated.gold_grams) * goldPrice.price_usd_per_gram * 100) / 100
            },
            insight: `Your ${currency || 'ZiG'} ${amount} is now stored as ${Math.round(goldGramsAdded * 1000000) / 1000000}g of gold. Even if ZiG weakens, your gold holds its value.`
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/wallet/withdraw (withdraw from authenticated user's wallet)
router.post('/withdraw', requireAuth, transactionLimiter, validateTransaction, async (req, res) => {
    try {
        const { amount, currency } = req.body;
        const userId = req.user.userId;

        const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (walletError || !wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        const goldPrice = await goldService.fetchGoldPrice();
        const rates = exchangeService.getExchangeRates();

        let newZigBalance = parseFloat(wallet.zig_balance);
        let newUsdBalance = parseFloat(wallet.usd_balance);
        let newGoldGrams = parseFloat(wallet.gold_grams);
        let goldGramsRemoved = 0;

        if (currency === 'USD') {
            if (newUsdBalance < amount) {
                return res.status(400).json({ error: 'Insufficient USD balance' });
            }
            newUsdBalance -= amount;
            goldGramsRemoved = amount / goldPrice.price_usd_per_gram;
        } else {
            if (newZigBalance < amount) {
                return res.status(400).json({ error: 'Insufficient ZiG balance' });
            }
            newZigBalance -= amount;
            const usdEquivalent = amount / rates.official_rate;
            goldGramsRemoved = usdEquivalent / goldPrice.price_usd_per_gram;
        }

        newGoldGrams = Math.max(0, newGoldGrams - goldGramsRemoved);

        const { data: updated, error: updateError } = await supabase
            .from('wallets')
            .update({
                zig_balance: newZigBalance,
                usd_balance: newUsdBalance,
                gold_grams: newGoldGrams,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({ error: updateError.message });
        }

        await supabase
            .from('transactions')
            .insert({
                from_user_id: userId,
                type: 'withdrawal',
                amount: amount,
                currency: currency || 'ZiG',
                gold_grams_equivalent: goldGramsRemoved,
                status: 'completed',
                description: `Withdrawal of ${currency || 'ZiG'} ${amount}`
            });

        res.json({
            status: 'success',
            message: `Withdrawn ${currency || 'ZiG'} ${amount}`,
            wallet: {
                zig_balance: updated.zig_balance,
                usd_balance: updated.usd_balance,
                gold_grams: updated.gold_grams,
                gold_value_usd: Math.round(parseFloat(updated.gold_grams) * goldPrice.price_usd_per_gram * 100) / 100
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/wallet/transfer (transfer from authenticated user to another user)
router.post('/transfer', requireAuth, transactionLimiter, validateTransfer, async (req, res) => {
    try {
        const { to_phone, amount, currency, purpose } = req.body;
        const fromUserId = req.user.userId;

        // Get sender info
        const { data: sender } = await supabase
            .from('users')
            .select('id, first_name, phone_number')
            .eq('id', fromUserId)
            .single();

        if (sender.phone_number === to_phone) {
            return res.status(400).json({ error: 'Cannot transfer to yourself' });
        }

        // Get receiver
        const { data: receiver } = await supabase
            .from('users')
            .select('id, first_name')
            .eq('phone_number', to_phone)
            .single();

        if (!receiver) {
            return res.status(404).json({ error: 'Receiver not found' });
        }

        // Get sender wallet
        const { data: senderWallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', fromUserId)
            .single();

        const balanceField = currency === 'USD' ? 'usd_balance' : 'zig_balance';
        if (parseFloat(senderWallet[balanceField]) < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Calculate fee
        let fee = 0;
        if (amount > 100) {
            fee = amount * 0.005;
        } else if (amount > 20) {
            fee = 0.50;
        }

        const goldPrice = await goldService.fetchGoldPrice();
        const rates = exchangeService.getExchangeRates();
        const usdAmount = currency === 'USD' ? amount : amount / rates.official_rate;
        const goldGrams = usdAmount / goldPrice.price_usd_per_gram;

        // Deduct from sender
        const senderUpdate = {};
        senderUpdate[balanceField] = parseFloat(senderWallet[balanceField]) - amount - fee;
        senderUpdate.gold_grams = Math.max(0, parseFloat(senderWallet.gold_grams) - goldGrams);

        await supabase
            .from('wallets')
            .update(senderUpdate)
            .eq('user_id', fromUserId);

        // Add to receiver
        const { data: receiverWallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', receiver.id)
            .single();

        const receiverUpdate = {};
        receiverUpdate[balanceField] = parseFloat(receiverWallet[balanceField]) + amount;
        receiverUpdate.gold_grams = parseFloat(receiverWallet.gold_grams) + goldGrams;

        await supabase
            .from('wallets')
            .update(receiverUpdate)
            .eq('user_id', receiver.id);

        // Record transaction
        await supabase
            .from('transactions')
            .insert({
                from_user_id: fromUserId,
                to_user_id: receiver.id,
                type: purpose ? `transfer:${purpose}` : 'transfer',
                amount: amount,
                currency: currency || 'ZiG',
                gold_grams_equivalent: goldGrams,
                fee: fee,
                status: 'completed',
                description: purpose
                    ? `${purpose} payment to ${receiver.first_name}`
                    : `Transfer to ${receiver.first_name}`
            });

        const ecocashFee = amount * 0.06;

        res.json({
            status: 'success',
            message: `Sent ${currency || 'ZiG'} ${amount} to ${receiver.first_name}`,
            transfer: {
                amount: amount,
                currency: currency || 'ZiG',
                fee: fee,
                total_deducted: amount + fee,
                purpose: purpose || 'general',
                receiver: receiver.first_name
            },
            comparison: {
                batana_fee: fee,
                ecocash_fee_estimate: Math.round(ecocashFee * 100) / 100,
                you_saved: Math.round((ecocashFee - fee) * 100) / 100
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Keep old routes for backward compatibility (but less secure)
router.get('/:userId', async (req, res) => {
    try {
        const { data: wallet, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', req.params.userId)
            .single();

        if (error || !wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        const goldPrice = await goldService.fetchGoldPrice();
        const rates = exchangeService.getExchangeRates();

        res.json({
            wallet: {
                zig_balance: wallet.zig_balance,
                usd_balance: wallet.usd_balance,
                gold_grams: wallet.gold_grams,
                gold_value_zig: Math.round(wallet.gold_grams * goldPrice.price_usd_per_gram * rates.official_rate * 100) / 100,
                gold_value_usd: Math.round(wallet.gold_grams * goldPrice.price_usd_per_gram * 100) / 100
            },
            gold_price: {
                per_gram_usd: Math.round(goldPrice.price_usd_per_gram * 100) / 100,
                per_gram_zig: Math.round(goldPrice.price_usd_per_gram * rates.official_rate * 100) / 100
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;