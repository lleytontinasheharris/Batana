// backend/src/services/exchangeService.js
// Handles ZiG/USD exchange rates and purchasing power calculations

const supabase = require('../config/supabase');

// Current ZiG exchange rate data
// In production, this would come from RBZ or a reliable API
// For now, we use realistic values that can be updated
let currentRates = {
    official_rate: 27.5,      // ZiG per USD (official RBZ rate)
    parallel_rate: 35.0,      // ZiG per USD (street rate)
    last_updated: new Date().toISOString()
};

function getExchangeRates() {
    const spread = ((currentRates.parallel_rate - currentRates.official_rate) / currentRates.official_rate) * 100;
    
    return {
        official_rate: currentRates.official_rate,
        parallel_rate: currentRates.parallel_rate,
        spread_percentage: Math.round(spread * 10) / 10,
        spread_status: spread < 10 ? 'healthy' : spread < 20 ? 'caution' : 'warning',
        last_updated: currentRates.last_updated
    };
}

function updateExchangeRates(official, parallel) {
    currentRates = {
        official_rate: official,
        parallel_rate: parallel,
        last_updated: new Date().toISOString()
    };
    return currentRates;
}

// Essential goods basket for purchasing power calculation
const essentialGoods = [
    { name: 'Bread (loaf)', category: 'food', unit: 'loaf' },
    { name: 'Mealie meal 10kg', category: 'food', unit: 'bag' },
    { name: 'Cooking oil 2L', category: 'food', unit: 'bottle' },
    { name: 'Sugar 2kg', category: 'food', unit: 'packet' },
    { name: 'Rice 2kg', category: 'food', unit: 'packet' },
    { name: 'Milk 1L', category: 'food', unit: 'carton' },
    { name: 'Eggs (crate 30)', category: 'food', unit: 'crate' },
    { name: 'Chicken (whole)', category: 'food', unit: 'piece' },
    { name: 'Tomatoes 1kg', category: 'food', unit: 'kg' },
    { name: 'Onions 1kg', category: 'food', unit: 'kg' },
    { name: 'Potatoes 1kg', category: 'food', unit: 'kg' },
    { name: 'Bus fare (local)', category: 'transport', unit: 'trip' },
    { name: 'Fuel (petrol) 1L', category: 'transport', unit: 'litre' },
    { name: 'Electricity (ZESA units)', category: 'utilities', unit: '50 units' },
    { name: 'Mobile data 1GB', category: 'communication', unit: 'bundle' },
    { name: 'Airtime', category: 'communication', unit: '$1 worth' },
    { name: 'Soap (bath)', category: 'household', unit: 'bar' },
    { name: 'Washing powder 1kg', category: 'household', unit: 'packet' },
    { name: 'School exercise book', category: 'education', unit: 'book' },
    { name: 'Paracetamol (10 tablets)', category: 'health', unit: 'packet' }
];

// Seed some realistic Harare prices (March 2024 estimates)
const samplePrices = {
    'Bread (loaf)': { zig: 25, usd: 0.90 },
    'Mealie meal 10kg': { zig: 350, usd: 12.50 },
    'Cooking oil 2L': { zig: 200, usd: 7.00 },
    'Sugar 2kg': { zig: 140, usd: 5.00 },
    'Rice 2kg': { zig: 180, usd: 6.50 },
    'Milk 1L': { zig: 70, usd: 2.50 },
    'Eggs (crate 30)': { zig: 280, usd: 10.00 },
    'Chicken (whole)': { zig: 300, usd: 10.70 },
    'Tomatoes 1kg': { zig: 80, usd: 2.85 },
    'Onions 1kg': { zig: 60, usd: 2.15 },
    'Potatoes 1kg': { zig: 50, usd: 1.80 },
    'Bus fare (local)': { zig: 15, usd: 0.50 },
    'Fuel (petrol) 1L': { zig: 45, usd: 1.60 },
    'Electricity (ZESA units)': { zig: 150, usd: 5.35 },
    'Mobile data 1GB': { zig: 30, usd: 1.00 },
    'Airtime': { zig: 28, usd: 1.00 },
    'Soap (bath)': { zig: 20, usd: 0.70 },
    'Washing powder 1kg': { zig: 90, usd: 3.20 },
    'School exercise book': { zig: 15, usd: 0.55 },
    'Paracetamol (10 tablets)': { zig: 25, usd: 0.90 }
};

// Calculate what 1 ZiG can buy
function calculatePurchasingPower() {
    const breadPrice = samplePrices['Bread (loaf)'].zig;
    const mealiePrice = samplePrices['Mealie meal 10kg'].zig;
    const busPrice = samplePrices['Bus fare (local)'].zig;
    
    return {
        one_zig_buys: {
            bread_loaves: Math.round((1 / breadPrice) * 1000) / 1000,
            mealie_meal_kg: Math.round((10 / mealiePrice) * 1000) / 1000,
            bus_trips: Math.round((1 / busPrice) * 1000) / 1000
        },
        one_hundred_zig_buys: {
            bread_loaves: Math.round(100 / breadPrice * 10) / 10,
            mealie_meal_kg: Math.round((100 / mealiePrice) * 10 * 10) / 10,
            bus_trips: Math.round(100 / busPrice * 10) / 10
        },
        basket_cost: {
            basic_weekly_food: 850,  // ZiG
            basic_monthly_food: 3400, // ZiG
            currency: 'ZiG'
        }
    };
}

// Get all sample prices
function getSamplePrices() {
    return Object.entries(samplePrices).map(([name, prices]) => ({
        name,
        price_zig: prices.zig,
        price_usd: prices.usd,
        source: 'sample_data'
    }));
}

// Store a price report from a user
async function reportPrice(itemName, priceZig, province, location, userId = null) {
    const { data, error } = await supabase
        .from('goods_prices')
        .insert({
            item_name: itemName,
            price_zig: priceZig,
            price_usd: priceZig / currentRates.official_rate,
            province: province,
            location: location,
            reported_by: userId
        })
        .select();
    
    if (error) {
        console.error('Error storing price report:', error);
        return null;
    }
    
    return data[0];
}

module.exports = {
    getExchangeRates,
    updateExchangeRates,
    essentialGoods,
    samplePrices,
    calculatePurchasingPower,
    getSamplePrices,
    reportPrice
};