const { pool } = require('../db/connection');

async function createOrder(orderData) {
    const {
        user_id, drop_id, payment_method, customer_name,
        customer_email, phone_number, items, total_price
    } = orderData;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const orderItems = Array.isArray(items) ? items : [];
        const itemCount = orderItems.length;
        const totalQuantity = orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

        const singleItem = itemCount === 1 ? orderItems[0] : null;
        const orderProductName = singleItem ? singleItem.product_name : itemCount > 1 ? 'Multiple Products' : null;
        const orderSize = singleItem ? singleItem.size : null;
        const orderColor = singleItem ? singleItem.color : null;
        const orderQualityLevelId = singleItem ? singleItem.quality_level_id : null;
        const orderPriceAtPurchase = singleItem ? singleItem.price_at_purchase : null;
        const orderQuantity = itemCount === 1 ? Number(singleItem.quantity || 1) : totalQuantity;
        const orderDropId = drop_id || (singleItem && singleItem.drop_id) || null;
        const orderTotalPrice = Number(total_price);

        const orderProductId = singleItem ? singleItem.product_id : null;
        const orderResult = await client.query(
            `INSERT INTO orders (
                user_id, product_id, drop_id, product_name, size, color,
                quantity, quality_level_id, price_at_purchase, total_price,
                status, payment_method, customer_name, customer_email, phone_number
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, $13, $14)
            RETURNING id`,
            [
                user_id || null,
                orderProductId,
                orderDropId,
                orderProductName,
                orderSize,
                orderColor,
                orderQuantity,
                orderQualityLevelId || null,
                orderPriceAtPurchase !== undefined ? orderPriceAtPurchase : null,
                orderTotalPrice,
                payment_method || 'reservation',
                customer_name || null,
                customer_email || null,
                phone_number || null
            ]
        );

        const orderId = orderResult.rows[0].id;

        for (const item of orderItems) {
            await client.query(
                `INSERT INTO order_items (
                    order_id, product_id, product_name, size, color,
                    quantity, quality_level_id, price_at_purchase, total_price
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    orderId,
                    item.product_id,
                    item.product_name || null,
                    item.size || null,
                    item.color || null,
                    item.quantity,
                    item.quality_level_id || null,
                    item.price_at_purchase,
                    item.total_price
                ]
            );
        }

        await client.query('COMMIT');
        return orderId;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function getOrderById(id) {
    const result = await pool.query(
        `SELECT o.*, p.name as product_name_from_products, p.image_urls as product_image_urls
         FROM orders o
         LEFT JOIN products p ON o.product_id = p.id
         WHERE o.id = $1`,
        [id]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!row.product_name && row.product_name_from_products) {
        row.product_name = row.product_name_from_products;
    }
    return row;
}

async function getOrdersByUser(userId) {
    const result = await pool.query(
        `SELECT o.*, p.name as product_name_from_products, p.image_urls as product_image_urls
         FROM orders o
         LEFT JOIN products p ON o.product_id = p.id
         WHERE o.user_id = $1
         ORDER BY o.created_at DESC`,
        [userId]
    );
    return result.rows.map(row => {
        if (!row.product_name && row.product_name_from_products) {
            row.product_name = row.product_name_from_products;
        }
        return row;
    });
}

async function getAllOrders(filters = {}) {
    const { status, productId, startDate, endDate } = filters;
    let query = `
        SELECT o.*, 
                p.name as product_name_from_products, 
                p.image_urls as product_image_urls,
                u.name as user_display_name,
                u.email as user_display_email
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        LEFT JOIN users u ON o.user_id = u.id
    `;
    
    const whereClauses = [];
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
        whereClauses.push(`o.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
    }
    if (productId && productId !== 'all') {
        whereClauses.push(`o.product_id = $${paramIndex}`);
        params.push(productId);
        paramIndex++;
    }
    if (startDate) {
        whereClauses.push(`o.created_at >= $${paramIndex}`);
        params.push(`${startDate}T00:00:00`);
        paramIndex++;
    }
    if (endDate) {
        whereClauses.push(`o.created_at <= $${paramIndex}`);
        params.push(`${endDate}T23:59:59`);
        paramIndex++;
    }

    if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY o.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows.map(row => {
        if (!row.product_name && row.product_name_from_products) {
            row.product_name = row.product_name_from_products;
        }
        return row;
    });
}

async function updateOrderStatus(orderId, newStatus) {
    const result = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2',
        [newStatus, orderId]
    );
    return result.rowCount > 0;
}

module.exports = {
    createOrder,
    getOrderById,
    getOrdersByUser,
    getAllOrders,
    updateOrderStatus
};