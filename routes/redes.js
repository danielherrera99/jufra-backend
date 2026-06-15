const express = require('express');
const router = express.Router();
const RedSocialPost = require('../models/RedSocialPost');
const { proteger, autorizarRoles } = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configurar almacenamiento de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/redes';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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
router.post('/', proteger, autorizarRoles('admin', 'consejo'), upload.single('imagen_file'), async (req, res) => {
    try {
        const payload = { ...req.body };
        
        if (req.file) {
            payload.image_url = `${req.protocol}://${req.get('host')}/uploads/redes/${req.file.filename}`;
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
router.put('/:id', proteger, autorizarRoles('admin', 'consejo'), upload.single('imagen_file'), async (req, res) => {
    try {
        let post = await RedSocialPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
        }

        const payload = { ...req.body };
        if (req.file) {
            payload.image_url = `${req.protocol}://${req.get('host')}/uploads/redes/${req.file.filename}`;
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
