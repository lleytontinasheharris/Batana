// backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Database
const supabase = require('./config/supabase');

// Routes
const trustRoutes = require('./routes/trustRoutes');

// Create app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({
        name: 'BATANA API',
        status: 'running',
        message: 'Banking, Assurance, Trading, And Nationwide Adoption',
        version: '0.1.0',
        endpoints: {
            trust_engine: '/api/trust/zig-health',
            gold_price: '/api/trust/gold-price',
            exchange_rates: '/api/trust/exchange-rates',
            prices: '/api/trust/prices',
            ussd_format: '/api/trust/ussd'
        }
    });
});

// API Routes
app.use('/api/trust', trustRoutes);

// Database test
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
            message: 'Database connected!',
            users_count: data.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  BATANA API Server');
    console.log('========================================');
    console.log(`  Status:  RUNNING`);
    console.log(`  Port:    ${PORT}`);
    console.log(`  URL:     http://localhost:${PORT}`);
    console.log('');
    console.log('  Endpoints:');
    console.log('  - GET  /api/trust/zig-health');
    console.log('  - GET  /api/trust/gold-price');
    console.log('  - GET  /api/trust/exchange-rates');
    console.log('  - GET  /api/trust/prices');
    console.log('  - GET  /api/trust/ussd');
    console.log('========================================');
    console.log('');
});