// backend/src/routes/mukandoRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const goldService = require('../services/goldService');
const exchangeService = require('../services/exchangeService');
const { requireAuth } = require('../middleware/auth');
const { validateMukandoCreate } = require('../middleware/validate');

// POST /api/mukando/create
// Create a new mukando group (protected)
router.post('/create', requireAuth, validateMukandoCreate, async (req, res) => {
    try {
        const { name, contribution_zig, cycle_months } = req.body;
        const creatorId = req.user.userId;

        // Get creator details
        const { data: creator } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('id', creatorId)
            .single();

        if (!creator) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Convert contribution to gold grams
        const goldPrice = await goldService.fetchGoldPrice();
        const rates = exchangeService.getExchangeRates();
        const usdEquivalent = contribution_zig / rates.official_rate;
        const contributionGoldGrams = usdEquivalent / goldPrice.price_usd_per_gram;

        // Create the group
        const { data: group, error: groupError } = await supabase
            .from('mukando_groups')
            .insert({
                name: name,
                contribution_gold_grams: contributionGoldGrams,
                cycle_months: cycle_months,
                current_month: 1,
                total_pool_gold_grams: 0,
                status: 'active',
                created_by: creator.id
            })
            .select()
            .single();

        if (groupError) {
            return res.status(500).json({ error: groupError.message });
        }

        // Add creator as first member
        const { error: memberError } = await supabase
            .from('mukando_members')
            .insert({
                group_id: group.id,
                user_id: creator.id,
                payout_order: 1,
                total_contributed_gold_grams: 0
            });

        if (memberError) {
            return res.status(500).json({ error: memberError.message });
        }

        res.status(201).json({
            status: 'success',
            message: `Mukando "${name}" created! Share the group code with members.`,
            group: {
                id: group.id,
                name: group.name,
                contribution_per_month: {
                    zig: contribution_zig,
                    gold_grams: Math.round(contributionGoldGrams * 1000000) / 1000000,
                    usd: Math.round(usdEquivalent * 100) / 100
                },
                cycle_months: cycle_months,
                members: 1,
                created_by: `${creator.first_name} ${creator.last_name}`
            },
            how_it_works: {
                step_1: `Each member contributes ${Math.round(contributionGoldGrams * 1000000) / 1000000}g gold per month`,
                step_2: `Pool rotates to one member each month for ${cycle_months} months`,
                step_3: 'Gold-gram denomination means the pool never loses value',
                step_4: 'Your contributions build your Vimbiso Credit Score'
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/mukando/:groupId/join
// Join an existing mukando group (protected)
router.post('/:groupId/join', requireAuth, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const userId = req.user.userId;

        // Get user details
        const { data: user } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('id', userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check group exists and is active
        const { data: group } = await supabase
            .from('mukando_groups')
            .select('*')
            .eq('id', groupId)
            .eq('status', 'active')
            .single();

        if (!group) {
            return res.status(404).json({ error: 'Mukando group not found or not active' });
        }

        // Check if already a member
        const { data: existing } = await supabase
            .from('mukando_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', user.id);

        if (existing && existing.length > 0) {
            return res.status(409).json({ error: 'Already a member of this group' });
        }

        // Check group is not full
        const { data: members } = await supabase
            .from('mukando_members')
            .select('id')
            .eq('group_id', groupId);

        if (members && members.length >= group.cycle_months) {
            return res.status(400).json({ 
                error: `Group is full. Maximum ${group.cycle_months} members for a ${group.cycle_months}-month cycle.` 
            });
        }

        const payoutOrder = (members ? members.length : 0) + 1;

        // Add member
        const { error: memberError } = await supabase
            .from('mukando_members')
            .insert({
                group_id: groupId,
                user_id: user.id,
                payout_order: payoutOrder,
                total_contributed_gold_grams: 0
            });

        if (memberError) {
            return res.status(500).json({ error: memberError.message });
        }

        const goldPrice = await goldService.fetchGoldPrice();
        const rates = exchangeService.getExchangeRates();
        const contributionZig = group.contribution_gold_grams * goldPrice.price_usd_per_gram * rates.official_rate;

        res.json({
            status: 'success',
            message: `${user.first_name} joined "${group.name}"!`,
            group: {
                name: group.name,
                your_payout_month: payoutOrder,
                total_members: payoutOrder,
                max_members: group.cycle_months,
                monthly_contribution: {
                    gold_grams: group.contribution_gold_grams,
                    zig_today: Math.round(contributionZig * 100) / 100
                }
            },
            note: `You are member #${payoutOrder}. You will receive the pool in month ${payoutOrder}.`
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/mukando/:groupId/contribute
// Make a monthly contribution (protected)
router.post('/:groupId/contribute', requireAuth, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const userId = req.user.userId;

        // Get user
        const { data: user } = await supabase
            .from('users')
            .select('id, first_name')
            .eq('id', userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get group
        const { data: group } = await supabase
            .from('mukando_groups')
            .select('*')
            .eq('id', groupId)
            .single();

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Get member record
        const { data: member } = await supabase
            .from('mukando_members')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();

        if (!member) {
            return res.status(403).json({ error: 'Not a member of this group' });
        }

        // Check if already contributed this month
        const { data: existingContribution } = await supabase
            .from('mukando_contributions')
            .select('id')
            .eq('group_id', groupId)
            .eq('member_id', member.id)
            .eq('month_number', group.current_month);

        if (existingContribution && existingContribution.length > 0) {
            return res.status(409).json({ 
                error: `Already contributed for month ${group.current_month}` 
            });
        }

        // Check wallet balance
        const { data: wallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const goldPrice = await goldService.fetchGoldPrice();
        const rates = exchangeService.getExchangeRates();
        const contributionZig = group.contribution_gold_grams * goldPrice.price_usd_per_gram * rates.official_rate;

        let zigBalance = parseFloat(wallet.zig_balance);
        let usdBalance = parseFloat(wallet.usd_balance);
        let autoConverted = false;
        let convertedAmount = 0;

        // Auto-convert USD to ZiG if needed
        if (zigBalance < contributionZig) {
            const shortfall = contributionZig - zigBalance;
            const usdNeeded = shortfall / rates.official_rate;
            
            if (usdBalance >= usdNeeded) {
                convertedAmount = usdNeeded;
                usdBalance -= usdNeeded;
                zigBalance += shortfall;
                autoConverted = true;
                
                await supabase
                    .from('wallets')
                    .update({
                        zig_balance: zigBalance,
                        usd_balance: usdBalance,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id);
                
                await supabase
                    .from('transactions')
                    .insert({
                        from_user_id: user.id,
                        to_user_id: user.id,
                        type: 'auto_conversion',
                        amount: shortfall,
                        currency: 'ZiG',
                        fee: 0,
                        status: 'completed',
                        description: `Auto-converted US$${Math.round(usdNeeded * 100) / 100} to ZiG ${Math.round(shortfall * 100) / 100} for mukando contribution`
                    });
            } else {
                const totalAvailableZig = zigBalance + (usdBalance * rates.official_rate);
                return res.status(400).json({
                    error: 'Insufficient balance',
                    required: Math.round(contributionZig * 100) / 100,
                    available_zig: Math.round(zigBalance * 100) / 100,
                    available_usd: Math.round(usdBalance * 100) / 100,
                    total_available_in_zig: Math.round(totalAvailableZig * 100) / 100,
                    currency: 'ZiG'
                });
            }
        }

        // Deduct from wallet
        const finalZigBalance = autoConverted ? (zigBalance - contributionZig) : (parseFloat(wallet.zig_balance) - contributionZig);
        const finalUsdBalance = autoConverted ? usdBalance : parseFloat(wallet.usd_balance);

        await supabase
            .from('wallets')
            .update({
                zig_balance: finalZigBalance,
                usd_balance: finalUsdBalance,
                gold_grams: Math.max(0, parseFloat(wallet.gold_grams) - group.contribution_gold_grams),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        // Record contribution
        await supabase
            .from('mukando_contributions')
            .insert({
                group_id: groupId,
                member_id: member.id,
                amount_gold_grams: group.contribution_gold_grams,
                month_number: group.current_month,
                status: 'confirmed'
            });

        // Update member total
        await supabase
            .from('mukando_members')
            .update({
                total_contributed_gold_grams: parseFloat(member.total_contributed_gold_grams) + group.contribution_gold_grams
            })
            .eq('id', member.id);

        // Update group pool
        await supabase
            .from('mukando_groups')
            .update({
                total_pool_gold_grams: parseFloat(group.total_pool_gold_grams) + group.contribution_gold_grams
            })
            .eq('id', groupId);

        // Record transaction
        await supabase
            .from('transactions')
            .insert({
                from_user_id: user.id,
                type: 'mukando_contribution',
                amount: contributionZig,
                currency: 'ZiG',
                gold_grams_equivalent: group.contribution_gold_grams,
                status: 'completed',
                description: `Mukando contribution to ${group.name} - Month ${group.current_month}`
            });

        // Check if all members paid
        const { data: allMembers } = await supabase
            .from('mukando_members')
            .select('id')
            .eq('group_id', groupId);

        const { data: monthContributions } = await supabase
            .from('mukando_contributions')
            .select('id')
            .eq('group_id', groupId)
            .eq('month_number', group.current_month);

        const allPaid = monthContributions.length >= allMembers.length;

        const response = {
            status: 'success',
            message: `Contribution confirmed for month ${group.current_month}!`,
            contribution: {
                gold_grams: group.contribution_gold_grams,
                zig_amount: Math.round(contributionZig * 100) / 100,
                month: group.current_month
            },
            group_status: {
                name: group.name,
                pool_gold_grams: Math.round((parseFloat(group.total_pool_gold_grams) + group.contribution_gold_grams) * 1000000) / 1000000,
                pool_zig: Math.round((parseFloat(group.total_pool_gold_grams) + group.contribution_gold_grams) * goldPrice.price_usd_per_gram * rates.official_rate * 100) / 100,
                members_paid: `${monthContributions.length}/${allMembers.length}`,
                all_paid: allPaid
            },
            vimbiso_impact: 'This contribution strengthens your credit score ↑'
        };

        if (autoConverted) {
            response.auto_conversion = {
                converted_usd: Math.round(convertedAmount * 100) / 100,
                to_zig: Math.round((convertedAmount * rates.official_rate) * 100) / 100,
                rate_used: rates.official_rate,
                note: 'USD was automatically converted to ZiG at the current rate to complete your contribution'
            };
        }

        res.json(response);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/mukando/:groupId/payout
// Distribute the pool (protected, any member can trigger)
router.post('/:groupId/payout', requireAuth, async (req, res) => {
    try {
        const groupId = req.params.groupId;

        const { data: group } = await supabase
            .from('mukando_groups')
            .select('*')
            .eq('id', groupId)
            .single();

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check all contributions are in
        const { data: allMembers } = await supabase
            .from('mukando_members')
            .select('*')
            .eq('group_id', groupId)
            .order('payout_order', { ascending: true });

        const { data: monthContributions } = await supabase
            .from('mukando_contributions')
            .select('id')
            .eq('group_id', groupId)
            .eq('month_number', group.current_month);

        if (monthContributions.length < allMembers.length) {
            return res.status(400).json({
                error: 'Not all members have contributed this month',
                paid: monthContributions.length,
                total: allMembers.length
            });
        }

        // Find recipient
        const recipient = allMembers.find(m => m.payout_order === group.current_month);

        if (!recipient) {
            return res.status(400).json({ error: 'No recipient found for this month' });
        }

        if (recipient.has_received_payout) {
            return res.status(409).json({ error: 'This month payout already distributed' });
        }

        const goldPrice = await goldService.fetchGoldPrice();
        const rates = exchangeService.getExchangeRates();
        const poolGoldGrams = group.contribution_gold_grams * allMembers.length;
        const payoutZig = poolGoldGrams * goldPrice.price_usd_per_gram * rates.official_rate;
        const payoutUsd = poolGoldGrams * goldPrice.price_usd_per_gram;

        // Add to recipient wallet
        const { data: recipientWallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', recipient.user_id)
            .single();

        await supabase
            .from('wallets')
            .update({
                zig_balance: parseFloat(recipientWallet.zig_balance) + payoutZig,
                gold_grams: parseFloat(recipientWallet.gold_grams) + poolGoldGrams,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', recipient.user_id);

        // Mark recipient as paid
        await supabase
            .from('mukando_members')
            .update({ has_received_payout: true })
            .eq('id', recipient.id);

        // Reset pool and advance month
        const nextMonth = group.current_month + 1;
        const isComplete = nextMonth > group.cycle_months;

        await supabase
            .from('mukando_groups')
            .update({
                current_month: isComplete ? group.current_month : nextMonth,
                total_pool_gold_grams: 0,
                status: isComplete ? 'completed' : 'active'
            })
            .eq('id', groupId);

        // Record transaction
        await supabase
            .from('transactions')
            .insert({
                to_user_id: recipient.user_id,
                type: 'mukando_payout',
                amount: payoutZig,
                currency: 'ZiG',
                gold_grams_equivalent: poolGoldGrams,
                status: 'completed',
                description: `Mukando payout from ${group.name} - Month ${group.current_month}`
            });

        const { data: recipientUser } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', recipient.user_id)
            .single();

        res.json({
            status: 'success',
            message: `Pool distributed to ${recipientUser.first_name} ${recipientUser.last_name}!`,
            payout: {
                recipient: `${recipientUser.first_name} ${recipientUser.last_name}`,
                gold_grams: Math.round(poolGoldGrams * 1000000) / 1000000,
                zig_amount: Math.round(payoutZig * 100) / 100,
                usd_amount: Math.round(payoutUsd * 100) / 100
            },
            group_status: {
                month_completed: group.current_month,
                next_month: isComplete ? 'CYCLE COMPLETE' : nextMonth,
                status: isComplete ? 'completed' : 'active'
            },
            gold_advantage: 'Because the pool is in gold-grams, every member receives the same real value regardless of when their turn comes.'
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/mukando/:groupId (public)
router.get('/:groupId', async (req, res) => {
    try {
        const groupId = req.params.groupId;

        const { data: group } = await supabase
            .from('mukando_groups')
            .select('*')
            .eq('id', groupId)
            .single();

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const { data: members } = await supabase
            .from('mukando_members')
            .select(`
                *,
                users:user_id (first_name, last_name, phone_number)
            `)
            .eq('group_id', groupId)
            .order('payout_order', { ascending: true });

        const { data: contributions } = await supabase
            .from('mukando_contributions')
            .select(`
                *,
                mukando_members:member_id (
                    user_id,
                    users:user_id (first_name, last_name)
                )
            `)
            .eq('group_id', groupId)
            .eq('month_number', group.current_month);

        const paidMemberIds = contributions.map(c => c.member_id);

        const goldPrice = await goldService.fetchGoldPrice();
        const rates = exchangeService.getExchangeRates();
        const poolZig = parseFloat(group.total_pool_gold_grams) * goldPrice.price_usd_per_gram * rates.official_rate;
        const poolUsd = parseFloat(group.total_pool_gold_grams) * goldPrice.price_usd_per_gram;
        const contributionZig = parseFloat(group.contribution_gold_grams) * goldPrice.price_usd_per_gram * rates.official_rate;

        const currentRecipient = members.find(m => m.payout_order === group.current_month);

        const memberStatus = members.map(m => ({
            name: `${m.users.first_name} ${m.users.last_name}`,
            payout_month: m.payout_order,
            has_received_payout: m.has_received_payout,
            paid_this_month: paidMemberIds.includes(m.id),
            total_contributed_gold_grams: parseFloat(m.total_contributed_gold_grams)
        }));

        res.json({
            group: {
                id: group.id,
                name: group.name,
                status: group.status,
                current_month: group.current_month,
                cycle_months: group.cycle_months
            },
            pool: {
                gold_grams: parseFloat(group.total_pool_gold_grams),
                zig: Math.round(poolZig * 100) / 100,
                usd: Math.round(poolUsd * 100) / 100
            },
            contribution: {
                gold_grams: parseFloat(group.contribution_gold_grams),
                zig_today: Math.round(contributionZig * 100) / 100
            },
            this_month: {
                month: group.current_month,
                recipient: currentRecipient ? `${currentRecipient.users.first_name} ${currentRecipient.users.last_name}` : 'TBD',
                contributions: `${contributions.length}/${members.length}`,
                all_paid: contributions.length >= members.length
            },
            members: memberStatus
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/mukando/user/:phone (public)
router.get('/user/:phone', async (req, res) => {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('id, first_name')
            .eq('phone_number', req.params.phone)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { data: memberships } = await supabase
            .from('mukando_members')
            .select(`
                *,
                mukando_groups:group_id (*)
            `)
            .eq('user_id', user.id);

        const goldPrice = await goldService.fetchGoldPrice();
        const rates = exchangeService.getExchangeRates();

        const groups = memberships.map(m => ({
            group_id: m.mukando_groups.id,
            name: m.mukando_groups.name,
            your_payout_month: m.payout_order,
            current_month: m.mukando_groups.current_month,
            has_received_payout: m.has_received_payout,
            total_contributed: {
                gold_grams: parseFloat(m.total_contributed_gold_grams),
                zig: Math.round(parseFloat(m.total_contributed_gold_grams) * goldPrice.price_usd_per_gram * rates.official_rate * 100) / 100
            },
            status: m.mukando_groups.status
        }));

        res.json({
            user: user.first_name,
            mukando_groups: groups,
            total_groups: groups.length
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;