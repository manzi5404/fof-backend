const productService = require('../models/product');

async function addProduct(req, res) {
    try {
        const productId = await productService.createProduct(req.body);
        res.json({ success: true, productId });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function getProducts(req, res) {
    try {
        const { dropId } = req.query;
        let products;
        if (dropId) {
            products = await productService.getProductsByDropId(dropId);
        } else {
            products = await productService.getAllProducts();
        }
        res.json({ success: true, products });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function getProduct(req, res) {
    try {
        const product = await productService.getProductById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, product });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function editProduct(req, res) {
    try {
        const updated = await productService.updateProduct(req.params.id, req.body);
        res.json({ success: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function removeProduct(req, res) {
    try {
        const removed = await productService.deleteProduct(req.params.id);
        res.json({ success: removed });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

module.exports = {
    addProduct,
    getProducts,
    getProduct,
    editProduct,
    removeProduct
};
