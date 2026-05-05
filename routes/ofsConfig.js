const express = require('express');
const router = express.Router();
const OfsConfig = require('../models/OfsConfig');
const { proteger, autorizarRoles } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar almacenamiento para el banner de la OFS
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/ofs';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, 'banner-ofs-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'), false);
        }
    }
});

// @route   GET /api/ofs-config
// @desc    Obtener configuración de la página OFS
// @access  Public
router.get('/', async (req, res) => {
    try {
        let config = await OfsConfig.findOne();
        if (!config) {
            config = await OfsConfig.create({});
        }
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/ofs-config
// @desc    Actualizar configuración de la página OFS (Soporta carga de imagen)
// @access  Private (Admin)
router.put('/', proteger, autorizarRoles('admin'), upload.single('bannerFile'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        // Si se subió un archivo, generar la URL
        if (req.file) {
            updateData.bannerImage = `${req.protocol}://${req.get('host')}/uploads/ofs/${req.file.filename}`;
        }

        // Convertir string de bannerActive a boolean si viene de FormData
        if (updateData.bannerActive === 'true') updateData.bannerActive = true;
        if (updateData.bannerActive === 'false') updateData.bannerActive = false;

        let config = await OfsConfig.findOne();
        if (!config) {
            config = await OfsConfig.create(updateData);
        } else {
            config = await OfsConfig.findOneAndUpdate({}, updateData, { new: true, runValidators: true });
        }

        res.status(200).json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
