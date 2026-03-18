const express = require('express');
const router = express.Router();
const Evento = require('../models/Evento');
const { proteger, autorizarRoles } = require('../middleware/auth');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar almacenamiento de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/eventos';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
});

// @route   GET /api/eventos
// @desc    Obtener todos los eventos futuros
// @access  Private
router.get('/', proteger, async (req, res) => {
    try {
        // Obtener eventos desde hoy en adelante
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const eventos = await Evento.find({ fecha: { $gte: hoy } })
            .sort({ fecha: 1 })
            .populate('creadoPor', 'nombre apellido');

        res.status(200).json({
            success: true,
            count: eventos.length,
            eventos
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener eventos'
        });
    }
});

// @route   POST /api/eventos
// @desc    Crear nuevo evento
// @access  Private (Admin/Consejo)
router.post('/', proteger, autorizarRoles('admin', 'consejo', 'coordinador'), upload.single('imagen'), async (req, res) => {
    try {
        const { titulo, descripcion, fecha, hora, lugar, tipo, lat, lng } = req.body;

        let imagenUrl = null;

        if (req.file) {
            imagenUrl = `${req.protocol}://${req.get('host')}/uploads/eventos/${req.file.filename}`;
        }

        const eventoData = {
            titulo,
            descripcion,
            fecha,
            hora,
            lugar,
            tipo,
            creadoPor: req.usuario._id,
            imagenUrl
        };

        if (lat && lng) {
            eventoData.ubicacion = {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            };
        }

        const evento = await Evento.create(eventoData);

        res.status(201).json({
            success: true,
            message: 'Evento creado exitosamente',
            evento
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al crear evento'
        });
    }
});

// @route   DELETE /api/eventos/:id
// @desc    Eliminar evento
// @access  Private (Admin/Consejo)
router.delete('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);

        if (!evento) {
            return res.status(404).json({ success: false, message: 'Evento no encontrado' });
        }

        await evento.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Evento eliminado'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar evento'
        });
    }
});

// @route   PUT /api/eventos/:id
// @desc    Actualizar evento
// @access  Private (Admin/Consejo)
router.put('/:id', proteger, autorizarRoles('admin', 'consejo', 'coordinador'), upload.single('imagen'), async (req, res) => {
    try {
        const camposActualizar = { ...req.body };

        if (req.file) {
            camposActualizar.imagenUrl = `${req.protocol}://${req.get('host')}/uploads/eventos/${req.file.filename}`;
        }

        if (req.body.lat && req.body.lng) {
            camposActualizar.ubicacion = {
                lat: parseFloat(req.body.lat),
                lng: parseFloat(req.body.lng)
            };
        }

        const evento = await Evento.findByIdAndUpdate(req.params.id, camposActualizar, {
            new: true,
            runValidators: true
        });

        if (!evento) {
            return res.status(404).json({ success: false, message: 'Evento no encontrado' });
        }

        res.status(200).json({
            success: true,
            message: 'Evento actualizado exitosamente',
            evento
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar evento'
        });
    }
});

module.exports = router;
