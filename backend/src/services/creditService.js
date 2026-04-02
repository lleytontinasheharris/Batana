// backend/src/services/creditService.js
// Calculates Vimbiso Credit Score from user activity

const supabase = require('../config/supabase');

// Score weights - total 100 points
const WEIGHTS = {
    MUKANDO_HISTORY: 30,      // Perfect contribution record
    MUKANDO_DURATION: 10,     // Completed cycles
    SAVINGS_CONSISTENCY: 15,  // Regular saving behavior
    SAVINGS_GROWTH: 5,        // Balance trending up
    TRANSACTION_ACTIVITY: 15, // Regular financial activity
    INSURANCE_PREMIUMS: 5,    // Insurance payments current
    LOAN_REPAYMENT: 10,       // Loan repayment history
    COMMUNITY_VERIFICATION: 10 // Vouches from other users
};

async function calculateVimbisoScore(userId) {
    const factors = {
        mukando_history: 0,
        mukando_duration: 0,
        savings_consistency: 0,
        savings_growth: 0,
        transaction_activity: 0,
        insurance_premiums: 0,
        loan_repayment: 5,  // Neutral starting point (no loans yet)
        community_verification: 0
    };

    // 1. MUKANDO HISTORY (30 points)
    // Get all mukando memberships for this user
    const { data: memberships } = await supabase
        .from('mukando_members')
        .select(`
            *,
            mukando_groups:group_id (*)
        `)
        .eq('user_id', userId);

    if (memberships && memberships.length > 0) {
        let totalExpectedContributions = 0;
        let totalActualContributions = 0;

        for (const membership of memberships) {
            const group = membership.mukando_groups;
            
            // How many contributions should they have made?
            const expectedContributions = Math.min(
                group.current_month,
                group.cycle_months
            );
            totalExpectedContributions += expectedContributions;

            // How many did they actually make?
            const { data: contributions } = await supabase
                .from('mukando_contributions')
                .select('id')
                .eq('member_id', membership.id)
                .eq('status', 'confirmed');

            totalActualContributions += contributions ? contributions.length : 0;
        }

        if (totalExpectedContributions > 0) {
            const contributionRate = totalActualContributions / totalExpectedContributions;
            factors.mukando_history = Math.round(contributionRate * WEIGHTS.MUKANDO_HISTORY);
        }

        // 2. MUKANDO DURATION (10 points)
        // Bonus for completed cycles
        let completedCycles = 0;
        for (const membership of memberships) {
            if (membership.mukando_groups.status === 'completed') {
                completedCycles++;
            }
        }
        
        if (completedCycles >= 2) {
            factors.mukando_duration = WEIGHTS.MUKANDO_DURATION;
        } else if (completedCycles === 1) {
            factors.mukando_duration = 5;
        } else if (memberships.length > 0) {
            // Active in a group but not completed yet
            factors.mukando_duration = 2;
        }
    }

    // 3. SAVINGS CONSISTENCY (15 points)
    // Check savings goals and deposits
    const { data: savingsGoals } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId);

    const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (wallet && parseFloat(wallet.gold_grams) > 0) {
        // Has savings
        if (parseFloat(wallet.gold_grams) >= 1) {
            factors.savings_consistency = 15; // Strong savings
        } else if (parseFloat(wallet.gold_grams) >= 0.5) {
            factors.savings_consistency = 10;
        } else if (parseFloat(wallet.gold_grams) >= 0.1) {
            factors.savings_consistency = 5;
        } else {
            factors.savings_consistency = 2;
        }
    }

    // 4. SAVINGS GROWTH (5 points)
    // Check if balance is growing (compare recent transactions)
    const { data: recentDeposits } = await supabase
        .from('transactions')
        .select('*')
        .eq('to_user_id', userId)
        .eq('type', 'deposit')
        .order('created_at', { ascending: false })
        .limit(5);

    const { data: recentWithdrawals } = await supabase
        .from('transactions')
        .select('*')
        .eq('from_user_id', userId)
        .eq('type', 'withdrawal')
        .order('created_at', { ascending: false })
        .limit(5);

    const depositTotal = recentDeposits ? 
        recentDeposits.reduce((sum, t) => sum + parseFloat(t.amount), 0) : 0;
    const withdrawalTotal = recentWithdrawals ? 
        recentWithdrawals.reduce((sum, t) => sum + parseFloat(t.amount), 0) : 0;

    if (depositTotal > withdrawalTotal * 1.5) {
        factors.savings_growth = 5; // Growing well
    } else if (depositTotal > withdrawalTotal) {
        factors.savings_growth = 3; // Growing
    } else {
        factors.savings_growth = 1; // At least has activity
    }

    // 5. TRANSACTION ACTIVITY (15 points)
    // Regular financial activity indicates income
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('id')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .gte('created_at', thirtyDaysAgo.toISOString());

    const transactionCount = recentTransactions ? recentTransactions.length : 0;

    if (transactionCount >= 20) {
        factors.transaction_activity = 15; // Very active
    } else if (transactionCount >= 10) {
        factors.transaction_activity = 12;
    } else if (transactionCount >= 5) {
        factors.transaction_activity = 8;
    } else if (transactionCount >= 1) {
        factors.transaction_activity = 4;
    }

    // 6. INSURANCE PREMIUMS (5 points)
    const { data: activePolicies } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

    if (activePolicies && activePolicies.length > 0) {
        factors.insurance_premiums = 5;
    }

    // 7. LOAN REPAYMENT (10 points)
    // Check loan history
    const { data: loans } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId);

    if (loans && loans.length > 0) {
        const completedOnTime = loans.filter(l => 
            l.status === 'completed' && 
            new Date(l.completed_at) <= new Date(l.due_date)
        ).length;
        
        const defaulted = loans.filter(l => l.status === 'defaulted').length;
        
        if (defaulted > 0) {
            factors.loan_repayment = 0;
        } else if (completedOnTime > 0) {
            factors.loan_repayment = 10;
        } else {
            factors.loan_repayment = 5; // Has active loan, not defaulted
        }
    }
    // If no loans, stays at neutral 5

    // 8. COMMUNITY VERIFICATION (10 points)
    // This would be vouches from other users - placeholder for now
    factors.community_verification = 0;

    // Calculate total score
    const totalScore = Object.values(factors).reduce((sum, val) => sum + val, 0);

    // Determine max loan amount based on score
    let maxLoanAmount = 0;
    if (totalScore >= 80) {
        maxLoanAmount = 500;
    } else if (totalScore >= 60) {
        maxLoanAmount = 200;
    } else if (totalScore >= 40) {
        maxLoanAmount = 50;
    } else if (totalScore >= 20) {
        maxLoanAmount = 20;
    }

    // Store the score
    const { data: scoreRecord, error } = await supabase
        .from('credit_scores')
        .upsert({
            user_id: userId,
            score: totalScore,
            factors: factors,
            max_loan_amount_usd: maxLoanAmount,
            calculated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id'
        })
        .select()
        .single();

    return {
        score: totalScore,
        factors: factors,
        max_loan_amount_usd: maxLoanAmount,
        score_breakdown: {
            mukando_history: `${factors.mukando_history}/${WEIGHTS.MUKANDO_HISTORY}`,
            mukando_duration: `${factors.mukando_duration}/${WEIGHTS.MUKANDO_DURATION}`,
            savings_consistency: `${factors.savings_consistency}/${WEIGHTS.SAVINGS_CONSISTENCY}`,
            savings_growth: `${factors.savings_growth}/${WEIGHTS.SAVINGS_GROWTH}`,
            transaction_activity: `${factors.transaction_activity}/${WEIGHTS.TRANSACTION_ACTIVITY}`,
            insurance_premiums: `${factors.insurance_premiums}/${WEIGHTS.INSURANCE_PREMIUMS}`,
            loan_repayment: `${factors.loan_repayment}/${WEIGHTS.LOAN_REPAYMENT}`,
            community_verification: `${factors.community_verification}/${WEIGHTS.COMMUNITY_VERIFICATION}`
        },
        rating: totalScore >= 80 ? '★★★★★ Excellent' :
                totalScore >= 60 ? '★★★★☆ Good' :
                totalScore >= 40 ? '★★★☆☆ Building' :
                totalScore >= 20 ? '★★☆☆☆ New' :
                '★☆☆☆☆ Start your journey'
    };
}

async function getScoreHistory(userId) {
    const { data, error } = await supabase
        .from('credit_scores')
        .select('*')
        .eq('user_id', userId)
        .order('calculated_at', { ascending: false })
        .limit(10);

    return data || [];
}

module.exports = {
    calculateVimbisoScore,
    getScoreHistory,
    WEIGHTS
};