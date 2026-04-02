// backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const supabase = require('./config/supabase');
const { generalLimiter } = require('./middleware/auth');

// Routes
const trustRoutes = require('./routes/trustRoutes');
const userRoutes = require('./routes/userRoutes');
const walletRoutes = require('./routes/walletRoutes');
const mukandoRoutes = require('./routes/mukandoRoutes');
const creditRoutes = require('./routes/creditRoutes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://batana.vercel.app'] 
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(generalLimiter);
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));

// Health check (public)
app.get('/', (req, res) => {
    res.json({
        name: 'BATANA API',
        status: 'running',
        version: '0.3.0',
        security: {
            authentication: 'JWT Bearer Token',
            rate_limiting: 'Active',
            input_validation: 'Active',
            pin_hashing: 'bcrypt'
        },
        endpoints: {
            trust: '/api/trust/zig-health',
            register: 'POST /api/users/register',
            login: 'POST /api/users/login',
            profile: 'GET /api/users/profile (auth required)',
            wallet: '/api/wallet/:userId',
            mukando: '/api/mukando',
            credit: '/api/credit/score/:phone'
        }
    });
});

// API Routes
app.use('/api/trust', trustRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/mukando', mukandoRoutes);
app.use('/api/credit', creditRoutes);

// Database test
app.get('/api/test-db', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        if (error) {
            return res.status(500).json({ error: error.message });
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

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `${req.method} ${req.path} does not exist`,
        help: 'Visit / for available endpoints'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  BATANA API Server v0.3.0');
    console.log('========================================');
    console.log(`  Status:   RUNNING`);
    console.log(`  Port:     ${PORT}`);
    console.log(`  URL:      http://localhost:${PORT}`);
    console.log(`  Security: ACTIVE`);
    console.log('');
    console.log('  Pillar 1: Trust Engine    ✓');
    console.log('  Pillar 2: Mukando         ✓');
    console.log('  Pillar 3: Users/Wallets   ✓');
    console.log('  Pillar 4: Credit Score    ✓');
    console.log('  Security: Auth + Rate Limiting ✓');
    console.log('========================================');
    console.log('');
});