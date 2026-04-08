const { pool } = require('../db/connection');

async function createOrder(orderData) {
    const {
        user_id, drop_id, payment_method, customer_name,
        customer_email, phone_number, items, total_price
    } = orderData;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

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
        const [orderResult] = await connection.query(
            `INSERT INTO orders (
                user_id, product_id, drop_id, product_name, size, color,
                quantity, quality_level_id, price_at_purchase, total_price,
                status, payment_method, customer_name, customer_email, phone_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
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

        const orderId = orderResult.insertId;

        for (const item of orderItems) {
            await connection.query(
                `INSERT INTO order_items (
                    order_id, product_id, product_name, size, color,
                    quantity, quality_level_id, price_at_purchase, total_price
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

        await connection.commit();
        return orderId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getOrderById(id) {
    const [rows] = await pool.query(
        `SELECT o.*, p.name as product_name_from_products, p.image_urls as product_image_urls
         FROM orders o
         LEFT JOIN products p ON o.product_id = p.id
         WHERE o.id = ?`,
        [id]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    if (!row.product_name && row.product_name_from_products) {
        row.product_name = row.product_name_from_products;
    }
    return row;
}

async function getOrdersByUser(userId) {
    const [rows] = await pool.query(
        `SELECT o.*, p.name as product_name_from_products, p.image_urls as product_image_urls
         FROM orders o
         LEFT JOIN products p ON o.product_id = p.id
         WHERE o.user_id = ?
         ORDER BY o.created_at DESC`,
        [userId]
    );
    return rows.map(row => {
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

    if (status && status !== 'all') {
        whereClauses.push('o.status = ?');
        params.push(status);
    }
    if (productId && productId !== 'all') {
        whereClauses.push('o.product_id = ?');
        params.push(productId);
    }
    if (startDate) {
        whereClauses.push('o.created_at >= ?');
        params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
        whereClauses.push('o.created_at <= ?');
        params.push(`${endDate} 23:59:59`);
    }

    if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY o.created_at DESC`;

    const [rows] = await pool.query(query, params);
    return rows.map(row => {
        if (!row.product_name && row.product_name_from_products) {
            row.product_name = row.product_name_from_products;
        }
        return row;
    });
}

async function updateOrderStatus(orderId, newStatus) {
    const [result] = await pool.query(
        'UPDATE orders SET status = ? WHERE id = ?',
        [newStatus, orderId]
    );
    return result.affectedRows > 0;
}

module.exports = {
    createOrder,
    getOrderById,
    getOrdersByUser,
    getAllOrders,
    updateOrderStatus
};
