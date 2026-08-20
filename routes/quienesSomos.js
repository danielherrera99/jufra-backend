const express = require('express');
const router = express.Router();
const QuienesSomos = require('../models/QuienesSomos');
const { proteger, autorizarRoles } = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'jufra_quienes_somos',
    resource_type: 'auto',
    public_id: (req, file) => `miembro-${Date.now()}`,
  },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for profile pictures
});

// @route   GET /api/quienes-somos
// @desc    Obtener todos los miembros
// @access  Public
router.get('/', async (req, res) => {
    try {
        const miembros = await QuienesSomos.find().orderBy('orden', 'asc');
        res.status(200).json({
            success: true,
            data: miembros
        });
    } catch (error) {
        console.error('Error al obtener miembros:', error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// @route   POST /api/quienes-somos
// @desc    Crear un miembro
// @access  Private (Admin, Equipo)
router.post('/', proteger, autorizarRoles('admin', 'equipo'), upload.single('foto'), async (req, res) => {
    try {
        const { nombre, rol, categoria, orden } = req.body;
        
        let fotoUrl = null;
        if (req.file) {
            fotoUrl = req.file.path;
        }

        const nuevoMiembro = await QuienesSomos.create({
            nombre,
            rol,
            categoria,
            fotoUrl,
            orden: orden ? parseInt(orden) : 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        res.status(201).json({
            success: true,
            data: nuevoMiembro
        });
    } catch (error) {
        console.error('Error al crear miembro:', error);
        res.status(500).json({ success: false, message: 'Error al crear miembro' });
    }
});

// @route   PUT /api/quienes-somos/:id
// @desc    Actualizar un miembro
// @access  Private
router.put('/:id', proteger, autorizarRoles('admin', 'equipo'), upload.single('foto'), async (req, res) => {
    try {
        const { nombre, rol, categoria, orden } = req.body;
        
        const updates = {
            nombre,
            rol,
            categoria,
            orden: orden ? parseInt(orden) : 0,
            updatedAt: new Date()
        };

        if (req.file) {
            updates.fotoUrl = req.file.path;
        }

        const miembroActualizado = await QuienesSomos.findByIdAndUpdate(req.params.id, updates);

        if (!miembroActualizado) {
            return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
        }

        // Recuperar para devolver completo
        const actualizado = await QuienesSomos.findById(req.params.id);

        res.status(200).json({
            success: true,
            data: actualizado
        });
    } catch (error) {
        console.error('Error al actualizar miembro:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar miembro' });
    }
});

// @route   DELETE /api/quienes-somos/:id
// @desc    Eliminar un miembro
// @access  Private
router.delete('/:id', proteger, autorizarRoles('admin', 'equipo'), async (req, res) => {
    try {
        const miembro = await QuienesSomos.findById(req.params.id);
        
        if (!miembro) {
            return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
        }

        await QuienesSomos.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Miembro eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar miembro:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar miembro' });
    }
});

module.exports = router;
