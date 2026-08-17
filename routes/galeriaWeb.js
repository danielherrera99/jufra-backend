const express = require('express');
const router = express.Router();
const GaleriaWeb = require('../models/GaleriaWeb');
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

// Configurar almacenamiento de archivos
// Configurar almacenamiento de archivos en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'jufra_galeria_web',
    resource_type: 'auto',
    public_id: (req, file) => `galeria-web-${Date.now()}`,
  },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// @route   GET /api/galeria-web
// @desc    Obtener toda la galería web (pública)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const galeria = await GaleriaWeb.find().sort({ fecha: -1 });

        res.status(200).json({
            success: true,
            count: galeria.length,
            galeria
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener galería web'
        });
    }
});

// @route   POST /api/galeria-web
// @desc    Añadir foto o video a la galería web
// @access  Private (Admin/Consejo)
router.post('/', proteger, autorizarRoles('admin', 'consejo'), upload.single('imagen_file'), async (req, res) => {
    try {
        let { titulo, descripcion, categoria, archivoUrl } = req.body;
        
        if (req.file) {
            archivoUrl = req.file.path;
        }
        
        if (!titulo || !archivoUrl) {
            return res.status(400).json({
                success: false,
                message: 'Por favor, proporciona al menos un título y la imagen (por archivo o URL).'
            });
        }

        const item = await GaleriaWeb.create({
            titulo,
            descripcion: descripcion || '',
            categoria: categoria || 'todas',
            archivoUrl,
            fecha: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Publicación agregada a la galería web',
            item
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al añadir a la galería web'
        });
    }
});

// @route   PUT /api/galeria-web/:id
// @desc    Editar item de la galería web
// @access  Private (Admin/Consejo)
router.put('/:id', proteger, autorizarRoles('admin', 'consejo'), upload.single('imagen_file'), async (req, res) => {
    try {
        const item = await GaleriaWeb.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item no encontrado' });
        }

        const payload = { ...req.body };
        if (req.file) {
            payload.archivoUrl = req.file.path;
        }

        const updatedItem = await GaleriaWeb.findByIdAndUpdate(req.params.id, payload);

        res.status(200).json({
            success: true,
            message: 'Item actualizado correctamente',
            item: updatedItem
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar item'
        });
    }
});

// @route   DELETE /api/galeria-web/:id
// @desc    Eliminar item de galería web
// @access  Private (Admin/Consejo)
router.delete('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const item = await GaleriaWeb.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item no encontrado' });
        }

        await item.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Item eliminado correctamente'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar item'
        });
    }
});

module.exports = router;
