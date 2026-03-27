// backend/src/services/goldService.js
// Fetches live gold prices and calculates ZiG equivalents

const supabase = require('../config/supabase');

// Gold price fetching with fallback
async function fetchGoldPrice() {
    const apiKey = process.env.GOLD_API_KEY;
    
    // Try GoldAPI.io first
    try {
        const response = await fetch('https://www.goldapi.io/api/XAU/USD', {
            headers: {
                'x-access-token': apiKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return {
                price_usd_per_ounce: data.price,
                price_usd_per_gram: data.price / 31.1035, // Troy ounce to gram
                source: 'goldapi',
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        console.log('GoldAPI failed, using fallback:', error.message);
    }
    
    // Fallback: Use a reasonable estimate based on recent prices
    // Gold is approximately $2,300-2,400 per ounce in 2024
    // We'll use this if API fails (free tier limit reached)
    return {
        price_usd_per_ounce: 2350,
        price_usd_per_gram: 2350 / 31.1035, // ~$75.55 per gram
        source: 'fallback',
        timestamp: new Date().toISOString()
    };
}

// Store gold price in database for history tracking
async function storeGoldPrice(priceData, zigRate = null) {
    const priceZig = zigRate ? priceData.price_usd_per_gram * zigRate : null;
    
    const { data, error } = await supabase
        .from('gold_prices')
        .insert({
            price_usd: priceData.price_usd_per_gram,
            price_zig: priceZig,
            source: priceData.source
        })
        .select();
    
    if (error) {
        console.error('Error storing gold price:', error);
        return null;
    }
    
    return data[0];
}

// Get latest stored gold price
async function getLatestGoldPrice() {
    const { data, error } = await supabase
        .from('gold_prices')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(1);
    
    if (error || !data || data.length === 0) {
        return null;
    }
    
    return data[0];
}

// Get gold price history for charts
async function getGoldPriceHistory(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
        .from('gold_prices')
        .select('*')
        .gte('fetched_at', startDate.toISOString())
        .order('fetched_at', { ascending: true });
    
    if (error) {
        console.error('Error fetching gold history:', error);
        return [];
    }
    
    return data;
}

// Convert ZiG to gold grams
function zigToGoldGrams(zigAmount, goldPriceZig) {
    if (!goldPriceZig || goldPriceZig === 0) return 0;
    return zigAmount / goldPriceZig;
}

// Convert gold grams to ZiG
function goldGramsToZig(grams, goldPriceZig) {
    return grams * goldPriceZig;
}

// Convert gold grams to USD
function goldGramsToUsd(grams, goldPriceUsd) {
    return grams * goldPriceUsd;
}

module.exports = {
    fetchGoldPrice,
    storeGoldPrice,
    getLatestGoldPrice,
    getGoldPriceHistory,
    zigToGoldGrams,
    goldGramsToZig,
    goldGramsToUsd
};