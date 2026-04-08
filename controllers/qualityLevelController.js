const qualityLevelService = require('../models/qualityLevel');

async function getQualityLevels(req, res) {
    try {
        const levels = await qualityLevelService.getAllQualityLevels();
        res.json({ success: true, qualityLevels: levels });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getQualityLevelById(req, res) {
    try {
        const id = req.params.id;
        const level = await qualityLevelService.getQualityLevelById(id);
        if (!level) {
            return res.status(404).json({ success: false, message: 'Quality level not found' });
        }
        res.json({ success: true, qualityLevel: level });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function createQualityLevel(req, res) {
    try {
        const { name, description, sort_order, is_active } = req.body;
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ success: false, message: 'name is required' });
        }

        const qualityLevelId = await qualityLevelService.createQualityLevel({
            name,
            description,
            sort_order: Number(sort_order) || 0,
            is_active: is_active ? 1 : 0
        });
        res.status(201).json({ success: true, qualityLevelId });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function updateQualityLevel(req, res) {
    try {
        const id = req.params.id;
        const { name, description, sort_order, is_active } = req.body;

        const updated = await qualityLevelService.updateQualityLevel(id, {
            name,
            description,
            sort_order: Number(sort_order) || 0,
            is_active: is_active ? 1 : 0
        });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Quality level not found or not updated' });
        }
        res.json({ success: true, updated });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function deleteQualityLevel(req, res) {
    try {
        const id = req.params.id;
        const deleted = await qualityLevelService.deleteQualityLevel(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Quality level not found' });
        }
        res.json({ success: true, deleted });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

module.exports = {
    getQualityLevels,
    getQualityLevelById,
    createQualityLevel,
    updateQualityLevel,
    deleteQualityLevel
};