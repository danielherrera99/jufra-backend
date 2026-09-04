const express = require('express');
const router = express.Router();
const WebConfig = require('../models/WebConfig');
const { proteger, autorizarRoles } = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Reutilizar configuración Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'jufra_web',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    public_id: (req, file) => `promo-web-${Date.now()}`,
  },
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

// @route   GET /api/web-config
// @desc    Obtener configuración pública de la web
// @access  Public
router.get('/', async (req, res) => {
    try {
        let config = await WebConfig.findOne();
        if (!config) {
            // Si no existe, crear una por defecto
            config = await WebConfig.create({});
        }
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/web-config
// @desc    Actualizar configuración de la web
// @access  Private (Admin)
router.put('/', proteger, autorizarRoles('admin'), upload.single('promoFile'), async (req, res) => {
    try {
        let updateData = { ...req.body };
        
        // Si se subió un archivo, usar URL de Cloudinary
        if (req.file) {
            updateData.promoImagenUrl = req.file.path;
        }

        // Convertir strings booleanos a boolean
        if (updateData.promoActiva === 'true') updateData.promoActiva = true;
        if (updateData.promoActiva === 'false') updateData.promoActiva = false;

        let config = await WebConfig.findOne();
        if (!config) {
            config = await WebConfig.create(updateData);
        } else {
            // Actualizar campos
            Object.assign(config, updateData);
            config.updatedAt = new Date();
            await config.save();
        }
        res.json({ success: true, message: 'Configuración actualizada correctamente', data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
