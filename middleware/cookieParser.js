/**
 * Custom cookie parser middleware to avoid external dependency issues.
 * Parses req.headers.cookie into req.cookies object.
 */
const cookieParser = (req, res, next) => {
    const cookieHeader = req.headers.cookie;
    req.cookies = {};

    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const value = decodeURIComponent(parts.slice(1).join('='));
                req.cookies[name] = value;
            }
        });
    }

    next();
};

module.exports = cookieParser;
