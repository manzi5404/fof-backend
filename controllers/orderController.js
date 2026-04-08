const orderModel = require('../models/order');
const notification = require('../models/notification');
const productService = require('../models/product');
const qualityPriceService = require('../models/productQualityPrice');

const createOrder = async (req, res) => {
    const userId = req.user ? req.user.id : null;
    const {
        items,
        product_id,
        drop_id,
        product_name,
        size,
        color,
        quantity,
        quality_level_id,
        price_at_purchase,
        total_price,
        payment_method,
        customer_name,
        customer_email,
        phone_number,
        customer_phone
    } = req.body;

    const normalizeItem = async (item) => {
        const productId = item.product_id;
        const quantityValue = Number(item.quantity || 1);
        if (!productId) {
            throw new Error('Each order item must include product_id');
        }
        if (!quantityValue || quantityValue <= 0) {
            throw new Error('Each order item must include a positive quantity');
        }

        const product = await productService.getProductById(productId);
        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }

        let priceValue = item.price_at_purchase !== undefined && item.price_at_purchase !== null
            ? Number(item.price_at_purchase)
            : null;
        let validatedQualityId = item.quality_level_id || null;

        if (validatedQualityId) {
            const qualityPrice = await qualityPriceService.getActiveQualityPrice(productId, validatedQualityId);
            if (!qualityPrice) {
                throw new Error(`Invalid quality_level_id ${validatedQualityId} for product ${productId}`);
            }
            if (priceValue !== null && Number(priceValue) !== Number(qualityPrice.price)) {
                throw new Error('price_at_purchase must equal the authorized quality price');
            }
            priceValue = Number(qualityPrice.price);
        }

        if (priceValue === null) {
            priceValue = Number(product.price);
        }
        if (Number.isNaN(priceValue) || priceValue <= 0) {
            throw new Error('Invalid price_at_purchase for order item');
        }

        const itemTotal = Number((priceValue * quantityValue).toFixed(2));
        if (item.total_price !== undefined && item.total_price !== null) {
            const providedTotal = Number(item.total_price);
            if (Number.isNaN(providedTotal) || providedTotal !== itemTotal) {
                throw new Error('total_price must equal price_at_purchase * quantity for each item');
            }
        }

        return {
            product_id: productId,
            drop_id: item.drop_id || drop_id || null,
            product_name: item.product_name || product.name,
            size: item.size || size || null,
            color: item.color || color || null,
            quantity: quantityValue,
            quality_level_id: validatedQualityId,
            price_at_purchase: priceValue,
            total_price: itemTotal
        };
    };

    try {
        let orderItems = [];
        if (Array.isArray(items) && items.length > 0) {
            orderItems = await Promise.all(items.map(normalizeItem));
        } else {
            if (!product_id) {
                return res.status(400).json({ success: false, message: 'product_id is required' });
            }
            orderItems = [await normalizeItem({
                product_id,
                drop_id,
                product_name,
                size,
                color,
                quantity: quantity || 1,
                quality_level_id,
                price_at_purchase,
                total_price
            })];
        }

        const orderTotal = orderItems.reduce((sum, item) => sum + item.total_price, 0);
        const requestTotal = total_price !== undefined && total_price !== null ? Number(total_price) : orderTotal;
        if (Number.isNaN(requestTotal) || requestTotal !== Number(orderTotal.toFixed(2))) {
            return res.status(400).json({
                success: false,
                message: 'total_price must equal the sum of item totals'
            });
        }

        const orderId = await orderModel.createOrder({
            user_id: userId,
            drop_id: drop_id || null,
            payment_method: payment_method || 'reservation',
            customer_name: customer_name || (req.user ? req.user.name : null),
            customer_email: customer_email || (req.user ? req.user.email : null),
            phone_number: phone_number || customer_phone || null,
            items: orderItems,
            total_price: orderTotal
        });

        await notification.createNotification(
            payment_method === 'momo' ? 'payment' : 'reservation',
            orderId,
            `New ${payment_method === 'momo' ? 'MoMo payment' : 'reservation'} from ${customer_name || (req.user ? req.user.name : 'Customer')}`,
            `Order ID: ${orderId} | Total: ${orderTotal} FRW`
        );

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            orderId
        });
    } catch (error) {
        console.error('❌ Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await orderModel.getOrdersByUser(userId);
        res.json({ success: true, orders });
    } catch (error) {
        console.error('❌ Get my orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const { status, productId, startDate, endDate } = req.query;
        const orders = await orderModel.getAllOrders({ status, productId, startDate, endDate });
        res.json({ success: true, orders });
    } catch (error) {
        console.error('❌ Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

const updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
    }

    try {
        const updated = await orderModel.updateOrderStatus(id, status);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, message: `Order status updated to ${status}` });
    } catch (error) {
        console.error('❌ Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};

module.exports = {
    createOrder,
    getMyOrders,
    getAllOrders,
    updateStatus
};
