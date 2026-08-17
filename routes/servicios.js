const express = require('express');
const router = express.Router();
const Servicio = require('../models/Servicio');
const db = require('../db');
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

// Configurar multer para subida de imágenes a Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'jufra_servicios',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    public_id: (req, file) => `servicio-${Date.now()}`,
  },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new Error('No es una imagen'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
});

// @route   GET /api/servicios
// @desc    Obtener todas las oportunidades de servicio
// @access  Private
router.get('/', proteger, async (req, res) => {
    try {
        const servicios = await Servicio.find()
            .sort({ fecha: 1 })
            .populate('participantes', 'nombre apellido foto');

        res.status(200).json({
            success: true,
            count: servicios.length,
            servicios
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener servicios'
        });
    }
});

// @route   POST /api/servicios
// @desc    Crear nueva oportunidad de servicio
// @access  Private (Admin/Consejo)
router.post('/', proteger, autorizarRoles('admin', 'consejo'), upload.single('imagen'), async (req, res) => {
    try {
        const { titulo, descripcion, fecha, lugar, cupoMaximo, lat, lng } = req.body;

        let imagen = null;
        if (req.file) {
            imagen = req.file.path; // Cloudinary URL
        }

        const servicioData = {
            titulo,
            descripcion,
            fecha,
            lugar,
            cupoMaximo,
            imagen,
            creadoPor: req.usuario._id
        };

        if (lat && lng) {
            servicioData.ubicacion = {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            };
        }

        const servicio = await Servicio.create(servicioData);

        res.status(201).json({
            success: true,
            message: 'Servicio creado correctamente',
            servicio
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al crear servicio'
        });
    }
});

// @route   PUT /api/servicios/:id/participar
// @desc    Inscribirse o desinscribirse de un servicio
// @access  Private
router.put('/:id/participar', proteger, async (req, res) => {
    try {
        const servicio = await Servicio.findById(req.params.id);

        if (!servicio) {
            return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }

        // Verificar si ya está inscrito
        const participacion = await db('servicio_participantes')
            .where({ servicio_id: req.params.id, usuario_id: req.usuario._id })
            .first();

        if (participacion) {
            // Ya está inscrito, desinscribir
            await db('servicio_participantes')
                .where({ servicio_id: req.params.id, usuario_id: req.usuario._id })
                .del();
                
            const servicioDoc = await Servicio.findById(req.params.id).populate('participantes');
            return res.status(200).json({
                success: true,
                message: 'Te has desinscrito del servicio',
                inscrito: false,
                servicio: servicioDoc
            });
        } else {
            // No está inscrito, verificar cupo
            const numParticipantesResult = await db('servicio_participantes')
                .where('servicio_id', req.params.id)
                .count('usuario_id as count')
                .first();
            const numParticipantes = parseInt(numParticipantesResult.count);

            if (servicio.cupoMaximo > 0 && numParticipantes >= servicio.cupoMaximo) {
                return res.status(400).json({
                    success: false,
                    message: 'El cupo para este servicio está lleno'
                });
            }

            // Inscribir
            await db('servicio_participantes').insert({
                servicio_id: req.params.id,
                usuario_id: req.usuario._id
            });

            const servicioDoc = await Servicio.findById(req.params.id).populate('participantes');
            return res.status(200).json({
                success: true,
                message: 'Te has inscrito al servicio correctamente',
                inscrito: true,
                servicio: servicioDoc
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar inscripción'
        });
    }
});

// @route   DELETE /api/servicios/:id
// @desc    Eliminar servicio
// @access  Private (Admin/Consejo)
router.delete('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const servicio = await Servicio.findById(req.params.id);

        if (!servicio) {
            return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }

        await servicio.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Servicio eliminado correctamente'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar servicio'
        });
    }
});

module.exports = router;
