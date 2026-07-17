const { pool } = require('../db/connection');
const { normalizeStoreMode } = require('../utils/storeMode');

let cachedStoreMode = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5000;

async function getCachedStoreMode() {
    const now = Date.now();
    if (cachedStoreMode && now < cacheExpiry) {
        return cachedStoreMode;
    }

    try {
        const result = await pool.query('SELECT store_mode FROM store_config WHERE id = 1');
        const mode = result.rows[0]?.store_mode || 'closed';
        cachedStoreMode = normalizeStoreMode(mode);
        cacheExpiry = now + CACHE_TTL_MS;
        return cachedStoreMode;
    } catch (error) {
        console.error('Store Mode Middleware Error:', error);
        return 'closed';
    }
}

const checkStoreMode = async (req, res, next) => {
    const restrictedPaths = ['/api/momo-pay'];

    const isRestrictedPath = restrictedPaths.some(path => req.originalUrl.startsWith(path));
    const isPostMethod = req.method === 'POST';

    if (isRestrictedPath && isPostMethod) {
        const currentMode = await getCachedStoreMode();
        if (currentMode === 'closed') {
            return res.status(403).json({
                success: false,
                message: 'Store status: CLOSED. New transactions are currently disabled.',
                mode: 'closed'
            });
        }

        if (currentMode === 'reserve') {
            return res.status(403).json({
                success: false,
                message: 'Store status: RESERVATION ONLY. Standard checkouts are disabled.',
                mode: 'reserve'
            });
        }
    }

    next();
};

module.exports = checkStoreMode;
