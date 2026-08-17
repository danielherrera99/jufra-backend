const express = require('express');
const router = express.Router();
const OfsConfig = require('../models/OfsConfig');
const { proteger, autorizarRoles } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configurar almacenamiento para el banner de la OFS en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'jufra_ofs',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    public_id: (req, file) => `banner-ofs-${Date.now()}`,
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
        
        // Si se subió un archivo, usar URL de Cloudinary
        if (req.file) {
            updateData.bannerImage = req.file.path;
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
