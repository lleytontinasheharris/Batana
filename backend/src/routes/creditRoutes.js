// backend/src/routes/creditRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const creditService = require('../services/creditService');

// GET /api/credit/score/:phone
// Calculate and return Vimbiso score for a user
router.get('/score/:phone', async (req, res) => {
    try {
        // Find user by phone
        const { data: user } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('phone_number', req.params.phone)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate score
        const scoreResult = await creditService.calculateVimbisoScore(user.id);

        res.json({
            user: `${user.first_name} ${user.last_name}`,
            phone: req.params.phone,
            Vimbiso_score: scoreResult.score,
            rating: scoreResult.rating,
            max_loan_eligible: `US$${scoreResult.max_loan_amount_usd}`,
            breakdown: scoreResult.score_breakdown,
            factors: scoreResult.factors,
            how_to_improve: generateImprovementTips(scoreResult.factors)
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/credit/score/id/:userId
// Calculate score by user ID
router.get('/score/id/:userId', async (req, res) => {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('id, first_name, last_name, phone_number')
            .eq('id', req.params.userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const scoreResult = await creditService.calculateVimbisoScore(user.id);

        res.json({
            user: `${user.first_name} ${user.last_name}`,
            phone: user.phone_number,
            Vimbiso_score: scoreResult.score,
            rating: scoreResult.rating,
            max_loan_eligible: `US$${scoreResult.max_loan_amount_usd}`,
            breakdown: scoreResult.score_breakdown,
            factors: scoreResult.factors,
            how_to_improve: generateImprovementTips(scoreResult.factors)
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/credit/ussd/:phone
// USSD-formatted score display
router.get('/ussd/:phone', async (req, res) => {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('id, first_name')
            .eq('phone_number', req.params.phone)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const scoreResult = await creditService.calculateVimbisoScore(user.id);
        
        const stars = scoreResult.score >= 80 ? '★★★★★' :
                      scoreResult.score >= 60 ? '★★★★☆' :
                      scoreResult.score >= 40 ? '★★★☆☆' :
                      scoreResult.score >= 20 ? '★★☆☆☆' : '★☆☆☆☆';

        const ussdText = `Vimbiso Score: ${scoreResult.score}/100
${stars}

You qualify for: US$${scoreResult.max_loan_amount_usd} loan

Mukando: ${scoreResult.factors.mukando_history}/30
Savings: ${scoreResult.factors.savings_consistency}/15
Activity: ${scoreResult.factors.transaction_activity}/15

1. Apply for loan
2. How to improve
3. Back`;

        res.json({
            ussd_text: ussdText,
            score: scoreResult.score,
            max_loan: scoreResult.max_loan_amount_usd
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper function to generate improvement tips
function generateImprovementTips(factors) {
    const tips = [];

    if (factors.mukando_history < 20) {
        tips.push('Join a mukando group and contribute on time (+30 pts max)');
    }
    if (factors.mukando_duration < 5) {
        tips.push('Complete a full mukando cycle (+10 pts)');
    }
    if (factors.savings_consistency < 10) {
        tips.push('Save regularly in gold-grams (+15 pts max)');
    }
    if (factors.transaction_activity < 10) {
        tips.push('Use BATANA for daily transactions (+15 pts max)');
    }
    if (factors.insurance_premiums === 0) {
        tips.push('Get funeral or business insurance (+5 pts)');
    }
    if (factors.community_verification < 5) {
        tips.push('Ask 3 community members to vouch for you (+10 pts)');
    }

    return tips.length > 0 ? tips : ['Keep up the great work!'];
}

module.exports = router;