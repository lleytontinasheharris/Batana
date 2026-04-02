// backend/src/middleware/validate.js
// Input validation and sanitization for all BATANA endpoints

// Sanitize string input - remove dangerous characters
function sanitize(input) {
    if (typeof input !== 'string') return input;
    return input
        .replace(/[<>]/g, '')      // Remove HTML tags
        .replace(/['"`;]/g, '')    // Remove quotes and semicolons
        .trim();                    // Remove whitespace
}

// Validate phone number (Zimbabwe format)
function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');
    // Accept: 07XXXXXXXX or +2637XXXXXXXX
    return /^(0|(\+?263))7[0-9]{8}$/.test(cleaned);
}

// Validate PIN (exactly 4 digits)
function isValidPin(pin) {
    if (!pin || typeof pin !== 'string') return false;
    return /^\d{4}$/.test(pin);
}

// Validate amount (positive number, reasonable range)
function isValidAmount(amount) {
    if (amount === null || amount === undefined) return false;
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 1000000;
}

// Validate currency
function isValidCurrency(currency) {
    return ['ZiG', 'USD'].includes(currency);
}

// Validate UUID
function isValidUUID(id) {
    if (!id || typeof id !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Middleware: Validate registration input
function validateRegistration(req, res, next) {
    const { phone_number, pin, first_name, last_name } = req.body;

    const errors = [];

    if (!phone_number) {
        errors.push('Phone number is required');
    } else if (!isValidPhone(phone_number)) {
        errors.push('Invalid phone number format. Use 07XXXXXXXX');
    }

    if (!pin) {
        errors.push('PIN is required');
    } else if (!isValidPin(pin)) {
        errors.push('PIN must be exactly 4 digits');
    }

    if (first_name && first_name.length > 50) {
        errors.push('First name too long (max 50 characters)');
    }

    if (last_name && last_name.length > 50) {
        errors.push('Last name too long (max 50 characters)');
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    // Sanitize inputs
    req.body.phone_number = phone_number.replace(/[\s-]/g, '');
    req.body.first_name = first_name ? sanitize(first_name) : null;
    req.body.last_name = last_name ? sanitize(last_name) : null;

    next();
}

// Middleware: Validate login input
function validateLogin(req, res, next) {
    const { phone_number, pin } = req.body;
    const errors = [];

    if (!phone_number || !isValidPhone(phone_number)) {
        errors.push('Valid phone number is required');
    }
    if (!pin || !isValidPin(pin)) {
        errors.push('Valid 4-digit PIN is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    req.body.phone_number = phone_number.replace(/[\s-]/g, '');
    next();
}

// Middleware: Validate transaction input
function validateTransaction(req, res, next) {
    const { amount, currency } = req.body;
    const errors = [];

    if (!amount || !isValidAmount(amount)) {
        errors.push('Valid amount is required (greater than 0)');
    }

    if (currency && !isValidCurrency(currency)) {
        errors.push('Currency must be ZiG or USD');
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    req.body.amount = parseFloat(amount);
    req.body.currency = currency || 'ZiG';
    next();
}

// Middleware: Validate transfer input
function validateTransfer(req, res, next) {
    const { from_phone, to_phone, amount, currency } = req.body;
    const errors = [];

    if (!from_phone || !isValidPhone(from_phone)) {
        errors.push('Valid sender phone number is required');
    }
    if (!to_phone || !isValidPhone(to_phone)) {
        errors.push('Valid receiver phone number is required');
    }
    if (from_phone === to_phone) {
        errors.push('Cannot transfer to yourself');
    }
    if (!amount || !isValidAmount(amount)) {
        errors.push('Valid amount is required');
    }
    if (currency && !isValidCurrency(currency)) {
        errors.push('Currency must be ZiG or USD');
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    req.body.amount = parseFloat(amount);
    req.body.currency = currency || 'ZiG';
    next();
}

// Middleware: Validate mukando creation
function validateMukandoCreate(req, res, next) {
    const { name, created_by_phone, contribution_zig, cycle_months } = req.body;
    const errors = [];

    if (!name || name.length < 3 || name.length > 100) {
        errors.push('Group name is required (3-100 characters)');
    }
    if (!created_by_phone || !isValidPhone(created_by_phone)) {
        errors.push('Valid phone number is required');
    }
    if (!contribution_zig || !isValidAmount(contribution_zig)) {
        errors.push('Valid contribution amount is required');
    }
    if (!cycle_months || cycle_months < 2 || cycle_months > 24) {
        errors.push('Cycle must be between 2 and 24 months');
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    req.body.name = sanitize(name);
    req.body.contribution_zig = parseFloat(contribution_zig);
    req.body.cycle_months = parseInt(cycle_months);
    next();
}

module.exports = {
    sanitize,
    isValidPhone,
    isValidPin,
    isValidAmount,
    isValidCurrency,
    isValidUUID,
    validateRegistration,
    validateLogin,
    validateTransaction,
    validateTransfer,
    validateMukandoCreate
};