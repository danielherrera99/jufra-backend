const express = require('express');
const router = express.Router();
const OfsConfig = require('../models/OfsConfig');
const { proteger, autorizarRoles } = require('../middleware/auth');

// @route   GET /api/ofs-config
// @desc    Obtener configuración pública de la landing OFS
// @access  Public
router.get('/', async (req, res) => {
    try {
        let config = await OfsConfig.findOne();
        if (!config) {
            config = new OfsConfig();
            await config.save();
        }
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/ofs-config
// @desc    Actualizar configuración de la landing OFS
// @access  Private (Admin)
router.put('/', proteger, autorizarRoles('admin'), async (req, res) => {
    try {
        let config = await OfsConfig.findOne();
        if (!config) {
            config = new OfsConfig(req.body);
        } else {
            Object.assign(config, req.body);
            config.updatedAt = Date.now();
        }
        await config.save();
        res.json({ success: true, message: 'Configuración OFS actualizada correctamente', data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
