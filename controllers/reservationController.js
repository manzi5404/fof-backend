const { pool } = require('../db/connection');
const notification = require('../models/notification');
const emailUtils = require('../utils/email');
const productService = require('../models/product');
const qualityPriceService = require('../models/productQualityPrice');

const createReservation = async (req, res) => {
    const { fullName, email: bodyEmail, phone, productId, size, color, quantity, storeMode, quality_level_id } = req.body;
    const userId = req.user ? req.user.id : null;
    const email = req.user ? req.user.email : bodyEmail;

    if (!email || !productId) {
        return res.status(400).json({ success: false, message: 'Missing email or productId' });
    }

    try {
        const resolvedFullName = fullName && fullName.trim() !== '' ? fullName :
            (bodyEmail ? bodyEmail.split('@')[0] : 'Guest');

        const product = await productService.getProductById(productId);
        if (!product) {
            return res.status(400).json({ success: false, message: 'Product not found' });
        }

        let priceAtPurchase = Number(product.price);
        if (quality_level_id) {
            const qualityPrice = await qualityPriceService.getActiveQualityPrice(productId, quality_level_id);
            if (!qualityPrice) {
                return res.status(400).json({ success: false, message: 'Invalid quality_level_id for selected product' });
            }
            priceAtPurchase = Number(qualityPrice.price);
        }

        const reservationData = {
            userId,
            fullName: resolvedFullName,
            email,
            phone: phone || 'N/A',
            productId,
            productName: product.name,
            size: size || 'M',
            color: color || 'Default',
            quantity: quantity || 1,
            qualityLevelId: quality_level_id || null,
            priceAtPurchase,
            storeMode: storeMode || 'live'
        };

        const [result] = await pool.query(
            `INSERT INTO reservations (
                user_id, full_name, email, phone, product_id, product_name,
                size, color, quantity, quality_level_id, price_at_purchase,
                store_mode, status
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                reservationData.userId,
                reservationData.fullName,
                reservationData.email,
                reservationData.phone,
                reservationData.productId,
                reservationData.productName,
                reservationData.size,
                reservationData.color,
                reservationData.quantity,
                reservationData.qualityLevelId,
                reservationData.priceAtPurchase,
                reservationData.storeMode
            ]
        );

        await notification.createNotification(
            'reservation',
            result.insertId,
            `Reservation: ${reservationData.fullName}`,
            `Product: ${reservationData.productName} | Mode: ${reservationData.storeMode}`
        );

        (async () => {
            try {
                await emailUtils.notifyReservation(email, reservationData, product);
            } catch (err) {
                console.error("❌ [EMAIL_ERROR] Failed to send reservation email:", err.message);
            }
        })();

        res.status(201).json({
            success: true,
            message: 'Reservation created successfully',
            data: {
                id: result.insertId,
                fullName: reservationData.fullName,
                email: reservationData.email,
                phone: reservationData.phone,
                productId: reservationData.productId,
                size: reservationData.size,
                color: reservationData.color,
                quantity: reservationData.quantity,
                quality_level_id: reservationData.qualityLevelId,
                price_at_purchase: reservationData.priceAtPurchase
            }
        });
    } catch (error) {
        console.error("❌ DB Reservation Error:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to create reservation',
            error: error.message,
            code: error.code
        });
    }
};

const getReservations = async (req, res) => {
    try {
        const { status, productId, startDate, endDate } = req.query;
        
        // Base query - NO ORDER BY here
        let query = `
SELECT 
    r.*,
    p.name AS productName,
    p.image_urls AS productImageUrls,
    p.price AS productBasePrice,
    u.name AS userName,
    u.email AS userEmail,
    ql.name AS qualityName
FROM reservations r
LEFT JOIN products p ON r.product_id = p.id
LEFT JOIN users u ON r.user_id = u.id
LEFT JOIN quality_levels ql ON r.quality_level_id = ql.id
`;
        
        const whereClauses = [];
        const params = [];

        if (status && status !== 'all') {
            whereClauses.push('r.status = ?');
            params.push(status);
        }
        if (productId && productId !== 'all') {
            whereClauses.push('r.product_id = ?');
            params.push(productId);
        }
        if (startDate) {
            whereClauses.push('r.created_at >= ?');
            params.push(`${startDate} 00:00:00`);
        }
        if (endDate) {
            whereClauses.push('r.created_at <= ?');
            params.push(`${endDate} 23:59:59`);
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // Add ORDER BY only once at the end
        query += ` ORDER BY r.created_at DESC`;

        console.log('Executing query:', query);
        
        const [rows] = await pool.query(query, params);
        
        // Transform into structured JSON
        const structuredReservations = rows.map(r => {
            const rawImageUrls = r.productImageUrls;
            let imageUrls = [];
            if (typeof rawImageUrls === 'string' && rawImageUrls.trim() !== '') {
                try {
                    imageUrls = JSON.parse(rawImageUrls);
                } catch (err) {
                    imageUrls = [rawImageUrls];
                }
            } else if (Array.isArray(rawImageUrls)) {
                imageUrls = rawImageUrls;
            } else if (rawImageUrls) {
                imageUrls = [rawImageUrls];
            }
            if (imageUrls.length === 0 && r.productImageUrl) {
                imageUrls = [r.productImageUrl];
            }

            const customerName = (r.full_name && r.full_name.trim()) || (r.userName && r.userName.trim()) ||
                (r.email ? r.email.split('@')[0] : 'Guest');

            return {
                id: r.id,
                user: {
                    name: customerName,
                    email: r.email || r.userEmail || "N/A",
                    phone: r.phone || "N/A"
                },
                product: {
                    name: r.productName || `Product #${r.product_id}`,
                    image_urls: imageUrls,
                    image_url: r.productImageUrl || imageUrls[0] || null
                },
                quantity: r.quantity,
                size: r.size,
                color: r.color,
                quality: r.quality_level_id ? {
                    id: r.quality_level_id,
                    name: r.qualityName || `Quality #${r.quality_level_id}`
                } : null,
                quality_level_id: r.quality_level_id || null,
                quality_name: r.qualityName || null,
                price_at_purchase: r.price_at_purchase || Number(r.productBasePrice) || null,
                store_mode: r.store_mode,
                status: r.status,
                created_at: r.created_at,
                updated_at: r.updated_at
            };
        });

        console.log('📦 RESERVATIONS_FETCH_RESULT:', structuredReservations);
        res.json({ success: true, reservations: structuredReservations });
    } catch (error) {
        console.error('❌ RESERVATION_FETCH_ERROR:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reservations', error: error.message });
    }
};

const updateReservationStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid reservation status' });
        }

        const [result] = await pool.query('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Reservation not found' });
        }

        res.json({ success: true, message: `Reservation marked as ${status}` });
    } catch (error) {
        console.error('❌ UPDATE_STATUS_ERROR:', error);
        res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
    }
};

const deleteReservation = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [result] = await pool.query('DELETE FROM reservations WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Reservation not found' });
        }
        
        res.json({ success: true, message: 'Reservation deleted' });
    } catch (error) {
        console.error('❌ DELETE_RESERVATION_ERROR:', error);
        res.status(500).json({ success: false, message: 'Failed to delete reservation', error: error.message });
    }
};

module.exports = {
    createReservation,
    getReservations,
    updateReservationStatus,
    deleteReservation
};
