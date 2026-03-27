// backend/src/routes/trustRoutes.js
// All endpoints for the Trust Engine (Pillar 1)

const express = require('express');
const router = express.Router();

const goldService = require('../services/goldService');
const exchangeService = require('../services/exchangeService');

// GET /api/trust/zig-health
// The main dashboard endpoint - everything a user needs to trust ZiG
router.get('/zig-health', async (req, res) => {
    try {
        // Fetch live gold price
        const goldPrice = await goldService.fetchGoldPrice();
        
        // Get exchange rates
        const exchangeRates = exchangeService.getExchangeRates();
        
        // Calculate purchasing power
        const purchasingPower = exchangeService.calculatePurchasingPower();
        
        // Calculate gold backing (simplified for demo)
        // In reality, this would come from RBZ published reserves
        const goldBackingPercentage = 78; // Demo value
        
        // Store this gold price for history
        await goldService.storeGoldPrice(goldPrice, exchangeRates.official_rate);
        
        res.json({
            timestamp: new Date().toISOString(),
            
            // Gold data
            gold: {
                price_usd_per_gram: Math.round(goldPrice.price_usd_per_gram * 100) / 100,
                price_zig_per_gram: Math.round(goldPrice.price_usd_per_gram * exchangeRates.official_rate * 100) / 100,
                price_usd_per_ounce: Math.round(goldPrice.price_usd_per_ounce * 100) / 100,
                source: goldPrice.source
            },
            
            // ZiG health indicators
            zig_health: {
                gold_backing_percentage: goldBackingPercentage,
                backing_status: goldBackingPercentage >= 70 ? 'strong' : goldBackingPercentage >= 50 ? 'adequate' : 'weak',
                official_rate: exchangeRates.official_rate,
                parallel_rate: exchangeRates.parallel_rate,
                spread_percentage: exchangeRates.spread_percentage,
                spread_status: exchangeRates.spread_status,
                confidence_index: Math.round((goldBackingPercentage * 0.5) + ((100 - exchangeRates.spread_percentage) * 0.5))
            },
            
            // What your money actually buys
            purchasing_power: {
                one_zig_buys: purchasingPower.one_zig_buys,
                one_hundred_zig_buys: purchasingPower.one_hundred_zig_buys,
                basket: purchasingPower.basket_cost
            },
            
            // Human-readable summary
            summary: {
                headline: `1 gram of gold = ZiG ${Math.round(goldPrice.price_usd_per_gram * exchangeRates.official_rate)}`,
                purchasing_power: `ZiG 100 buys ${purchasingPower.one_hundred_zig_buys.bread_loaves} loaves of bread`,
                market_spread: exchangeRates.spread_status === 'healthy' 
                    ? 'Market rates are stable' 
                    : `Street rate is ${exchangeRates.spread_percentage}% above official`,
                advice: exchangeRates.spread_status === 'warning' 
                    ? 'Consider saving in gold-grams to protect value' 
                    : 'ZiG is currently stable'
            }
        });
        
    } catch (error) {
        console.error('Trust engine error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch trust data',
            error: error.message
        });
    }
});

// GET /api/trust/gold-price
// Just the gold price, updated
router.get('/gold-price', async (req, res) => {
    try {
        const goldPrice = await goldService.fetchGoldPrice();
        const exchangeRates = exchangeService.getExchangeRates();
        
        res.json({
            timestamp: new Date().toISOString(),
            price_usd_per_gram: Math.round(goldPrice.price_usd_per_gram * 100) / 100,
            price_zig_per_gram: Math.round(goldPrice.price_usd_per_gram * exchangeRates.official_rate * 100) / 100,
            price_usd_per_ounce: Math.round(goldPrice.price_usd_per_ounce * 100) / 100,
            source: goldPrice.source
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/trust/gold-history
// Historical gold prices for charts
router.get('/gold-history', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const history = await goldService.getGoldPriceHistory(days);
        
        res.json({
            period_days: days,
            data_points: history.length,
            prices: history
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/trust/exchange-rates
// Current exchange rates
router.get('/exchange-rates', (req, res) => {
    const rates = exchangeService.getExchangeRates();
    res.json({
        timestamp: new Date().toISOString(),
        ...rates
    });
});

// GET /api/trust/prices
// Essential goods prices
router.get('/prices', (req, res) => {
    const prices = exchangeService.getSamplePrices();
    const purchasingPower = exchangeService.calculatePurchasingPower();
    
    res.json({
        timestamp: new Date().toISOString(),
        currency: 'ZiG',
        items: prices,
        purchasing_power: purchasingPower
    });
});

// POST /api/trust/report-price
// User reports a price they saw
router.post('/report-price', async (req, res) => {
    try {
        const { item_name, price_zig, province, location } = req.body;
        
        if (!item_name || !price_zig) {
            return res.status(400).json({ 
                error: 'item_name and price_zig are required' 
            });
        }
        
        const report = await exchangeService.reportPrice(
            item_name, 
            price_zig, 
            province || 'Unknown',
            location || 'Unknown'
        );
        
        res.json({
            status: 'success',
            message: 'Price reported. Thank you for contributing!',
            report
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/trust/ussd
// USSD-formatted response for feature phones
router.get('/ussd', async (req, res) => {
    try {
        const goldPrice = await goldService.fetchGoldPrice();
        const exchangeRates = exchangeService.getExchangeRates();
        const purchasingPower = exchangeService.calculatePurchasingPower();
        
        // Format for USSD (160 character screens)
        const ussdText = `ZiG Health Today

Gold: $${Math.round(goldPrice.price_usd_per_gram)}/gram
Rate: ZiG ${exchangeRates.official_rate}/USD
Spread: ${exchangeRates.spread_percentage}%
Status: ${exchangeRates.spread_status.toUpperCase()}

ZiG 100 = ${purchasingPower.one_hundred_zig_buys.bread_loaves} loaves

1. Save in gold-grams
2. Check prices
3. Back`;

        res.json({
            ussd_text: ussdText,
            character_count: ussdText.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;