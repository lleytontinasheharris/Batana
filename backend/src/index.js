// backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const supabase = require('./config/supabase');
const { generalLimiter } = require('./middleware/auth');

// ── Routes ─────────────────────────────────────────────────
const trustRoutes      = require('./routes/trustRoutes');
const userRoutes       = require('./routes/userRoutes');
const walletRoutes     = require('./routes/walletRoutes');
const mukandoRoutes    = require('./routes/mukandoRoutes');
const creditRoutes     = require('./routes/creditRoutes');
const verifyRoutes     = require('./routes/verifyRoutes');
const adminRoutes      = require('./routes/adminRoutes');
const insuranceRoutes  = require('./routes/insuranceRoutes');
const loanRoutes       = require('./routes/loanRoutes');
const nextOfKinRoutes  = require('./routes/nextOfKinRoutes');
const storeRoutes      = require('./routes/storeRoutes');
const investRoutes     = require('./routes/investRoutes');

const app = express();

// ── Security middleware ────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://batana.vercel.app']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(generalLimiter);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// ── Health check (public) ──────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'BATANA API',
    status: 'running',
    version: '0.4.0',
    tagline: 'Building Together',
    security: {
      authentication: 'JWT Bearer Token',
      rate_limiting: 'Active',
      input_validation: 'Active',
      pin_hashing: 'bcrypt',
    },
    pillars: {
      SAVE:    'Vimbiso Wallet     — /api/wallet',
      TRUST:   'Trust Engine       — /api/trust',
      PROTECT: 'Insurance          — /api/insurance',
      GROW:    'Investment Pools   — /api/invest',
    },
    endpoints: {
      // Public
      trust:        'GET  /api/trust/zig-health',
      gold:         'GET  /api/trust/gold-price',
      register:     'POST /api/users/register',
      login:        'POST /api/users/login',
      // Auth required
      profile:      'GET  /api/users/profile',
      wallet:       'GET  /api/wallet',
      mukando:      'GET  /api/mukando',
      score:        'GET  /api/credit/score/:phone',
      insurance:    'GET  /api/insurance/my-policies',
      loans:        'GET  /api/loans/eligibility',
      kin:          'GET  /api/kin/my-kin',
      invest:       'GET  /api/invest/pools',
      // Store
      store_lookup: 'POST /api/store/lookup',
      store_confirm:'POST /api/store/confirm',
      // Admin
      admin:        'GET  /api/admin/dashboard',
    },
  });
});

// ── API Routes ─────────────────────────────────────────────
app.use('/api/trust',     trustRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/wallet',    walletRoutes);
app.use('/api/mukando',   mukandoRoutes);
app.use('/api/credit',    creditRoutes);
app.use('/api/verify',    verifyRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/loans',     loanRoutes);
app.use('/api/kin',       nextOfKinRoutes);
app.use('/api/store',     storeRoutes);
app.use('/api/invest',    investRoutes);

// ── Database connectivity test ─────────────────────────────
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      status: 'success',
      message: 'Supabase connected',
      sample_row_count: data.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 404 handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `${req.method} ${req.path} does not exist`,
    help: 'Visit GET / for all available endpoints',
  });
});

// ── Global error handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Something went wrong',
  });
});

// ── Start server ───────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║         BATANA API Server v0.4.0         ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Status : RUNNING                        ║`);
  console.log(`║  Port   : ${PORT}                           ║`);
  console.log(`║  URL    : http://localhost:${PORT}           ║`);
  console.log('╠══��═══════════════════════════════════════╣');
  console.log('║  SAVE    Vimbiso Wallet        ✓         ║');
  console.log('║  TRUST   Trust Engine          ✓         ║');
  console.log('║  PROTECT Insurance             ✓         ║');
  console.log('║  GROW    Investment Pools      ✓         ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  Auth + Rate Limiting          ✓         ║');
  console.log('║  Loans  (PIN + Store + Admin)  ✓         ║');
  console.log('║  Next of Kin                   ✓         ║');
  console.log('║  Store Attendant Portal        ✓         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});