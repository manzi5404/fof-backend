const jwt = require('jsonwebtoken');

/**
 * Basic Authentication Middleware
 * Simply ensures the user is logged in with a valid token.
 */
const protect = (req, res, next) => {
    const token = req.cookies.auth_token;

    if (!token) {
        return res.status(401).json({ success: false, message: 'You must be logged in to access this resource' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fof_secret');
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Session expired' });
        }
        res.clearCookie('auth_token');
        return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    }
};

/**
 * Administrative Authorization Middleware
 * Verifies the user is logged in AND is on the whitelist.
 */
const verifyAdmin = (req, res, next) => {
    const cookieToken = req.cookies.auth_token;
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null;
    const token = cookieToken || headerToken;

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fof_secret');

        // Exact list of admin emails
        const adminEmails = [
            'manziroyal38@gmail.com',
            'manziluckyun@gmail.com',
            'cangebrunain@gmail.com'
        ].map(e => e.trim().toLowerCase());

        if (!adminEmails.includes(decoded.email.toLowerCase())) {
            // Do not destroy the cookie, just deny access to admin features
            // This allows them to stay logged in as a normal user
            return res.status(403).json({ success: false, message: 'Unauthorized. This account does not have admin access' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Session expired' });
        }
        res.clearCookie('auth_token');
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

module.exports = { protect, verifyAdmin };
