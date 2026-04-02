// backend/src/middleware/auth.js
// Authentication and security middleware for BATANA

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Generate JWT token for a user
function generateToken(userId, phoneNumber) {
    return jwt.sign(
        { 
            userId, 
            phoneNumber,
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
}

// Middleware: Verify JWT token on protected routes
function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No authentication token provided. Login first.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to request object
        req.user = {
            userId: decoded.userId,
            phoneNumber: decoded.phoneNumber
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Session expired',
                message: 'Please login again.'
            });
        }
        return res.status(401).json({
            error: 'Invalid token',
            message: 'Authentication failed.'
        });
    }
}

// Rate limiter: General API (100 requests per 15 minutes)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Too many requests',
        message: 'Please try again in 15 minutes.',
        retry_after_minutes: 15
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiter: Login attempts (5 per 15 minutes per IP)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: 'Too many login attempts',
        message: 'Account temporarily locked. Try again in 15 minutes.',
        retry_after_minutes: 15
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiter: Transactions (20 per hour)
const transactionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        error: 'Transaction limit reached',
        message: 'Maximum 20 transactions per hour. Try again later.',
        retry_after_minutes: 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiter: Registration (3 per hour per IP)
const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        error: 'Registration limit reached',
        message: 'Too many registration attempts. Try again in 1 hour.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    generateToken,
    requireAuth,
    generalLimiter,
    loginLimiter,
    transactionLimiter,
    registrationLimiter
};