const express = require('express');
const router = express.Router();
const RedSocialPost = require('../models/RedSocialPost');
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
    folder: 'jufra_redes',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    public_id: (req, file) => `redes-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const cpUpload = upload.fields([
    { name: 'imagen_file', maxCount: 1 },
    { name: 'author_icon_file', maxCount: 1 }
]);

// @route   GET /api/redes
// @desc    Obtener todas las publicaciones de redes sociales
// @access  Public
router.get('/', async (req, res) => {
    try {
        const posts = await RedSocialPost.find().sort({ created_at: -1 });
        res.json({ success: true, posts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener publicaciones' });
    }
});

// @route   POST /api/redes
// @desc    Crear una nueva publicación
// @access  Private (Admin/Consejo)
router.post('/', proteger, autorizarRoles('admin', 'consejo'), cpUpload, async (req, res) => {
    try {
        const payload = { ...req.body };
        
        if (req.files && req.files['imagen_file']) {
            payload.image_url = req.files['imagen_file'][0].path;
        }
        
        if (req.files && req.files['author_icon_file']) {
            payload.author_icon = req.files['author_icon_file'][0].path;
        }
        
        if (payload.activo !== undefined) {
            payload.activo = payload.activo === 'true' || payload.activo === true;
        }

        const nuevaPublicacion = await RedSocialPost.create(payload);
        res.status(201).json({ success: true, data: nuevaPublicacion });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear la publicación' });
    }
});

// @route   PUT /api/redes/:id
// @desc    Actualizar una publicación
// @access  Private (Admin/Consejo)
router.put('/:id', proteger, autorizarRoles('admin', 'consejo'), cpUpload, async (req, res) => {
    try {
        let post = await RedSocialPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
        }

        const payload = { ...req.body };
        if (req.files && req.files['imagen_file']) {
            payload.image_url = req.files['imagen_file'][0].path;
        }
        
        if (req.files && req.files['author_icon_file']) {
            payload.author_icon = req.files['author_icon_file'][0].path;
        }
        
        if (payload.activo !== undefined) {
            payload.activo = payload.activo === 'true' || payload.activo === true;
        }

        const updatedPost = await RedSocialPost.findByIdAndUpdate(req.params.id, payload);

        res.json({ success: true, data: updatedPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar la publicación' });
    }
});

// @route   DELETE /api/redes/:id
// @desc    Eliminar una publicación
// @access  Private (Admin/Consejo)
router.delete('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const post = await RedSocialPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
        }

        await RedSocialPost.findByIdAndDelete(req.params.id);
        res.json({ success: true, data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar la publicación' });
    }
});

module.exports = router;
