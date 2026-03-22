// backend/src/index.js
// This is the entry point for the BATANA backend server

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Create the Express application
const app = express();

// Middleware - these run on every request
app.use(helmet());        // Security headers
app.use(cors());          // Allow cross-origin requests
app.use(morgan('dev'));   // Log requests to console
app.use(express.json());  // Parse JSON request bodies

// Health check route - to verify the server is running
app.get('/', (req, res) => {
    res.json({
        name: 'BATANA API',
        status: 'running',
        message: 'Banking, Assurance, Trading, And Nationwide Adoption',
        version: '0.1.0',
        pillars: [
            'TRUST - ZiG Intelligence Engine',
            'PROTECT - Savings and Insurance',
            'CONNECT - Reaching Every Zimbabwean',
            'BUILD - Financial Identity and Credit',
            'GROW - Investments and Prosperity'
        ]
    });
});

// ZiG Trust Engine - basic route (we will expand this)
app.get('/api/trust/zig-health', (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        zig_health: {
            gold_backing_percentage: null,
            official_rate: null,
            parallel_rate: null,
            spread_percentage: null,
            confidence_index: null
        },
        purchasing_power: {
            bread_loaves_per_zig: null,
            last_month_bread_loaves: null,
            direction: null
        },
        message: 'Trust engine data will be live once APIs are connected'
    });
});

// Set the port
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  BATANA API Server');
    console.log('  Banking, Assurance, Trading,');
    console.log('  And Nationwide Adoption');
    console.log('========================================');
    console.log(`  Status:  RUNNING`);
    console.log(`  Port:    ${PORT}`);
    console.log(`  URL:     http://localhost:${PORT}`);
    console.log('========================================');
    console.log('');
});