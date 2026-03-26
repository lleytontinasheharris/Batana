// backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Database connection
const supabase = require('./config/supabase');

// Create the Express application
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check route
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

// ZiG Trust Engine
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

// Test database connection
app.get('/api/test-db', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (error) {
            return res.status(500).json({
                status: 'error',
                message: 'Database connection failed',
                error: error.message
            });
        }

        res.json({
            status: 'success',
            message: 'Database connected successfully!',
            users_count: data.length,
            note: 'BATANA is ready to serve Zimbabwe'
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
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