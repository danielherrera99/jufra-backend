const express = require('express');
const router = express.Router();
const Evento = require('../models/Evento');
const Usuario = require('../models/Usuario');
const { proteger, autorizarRoles } = require('../middleware/auth');
const { enviarNotificacionGrupal } = require('../utils/expoPush');

const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configurar almacenamiento de archivos en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'jufra_eventos',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    public_id: (req, file) => `evento-${Date.now()}`,
  },
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

        let query = { fecha: { $gte: hoy } };
        let sortOption = { fecha: 1 };

        if (req.query.todos === 'true') {
            query = {};
            sortOption = { fecha: -1 }; // Descendente para ver los más recientes arriba
        }

        const eventos = await Evento.find(query)
            .sort(sortOption)
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

// @route   GET /api/eventos/web
// @desc    Obtener eventos para la web publica
// @access  Public
router.get('/web', async (req, res) => {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const eventos = await Evento.find({ fecha: { $gte: hoy }, publicar_web: true })
            .sort({ fecha: 1 });

        res.status(200).json({
            success: true,
            eventos
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener eventos para web' });
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
            imagenUrl = req.file.path;
        }

        let publicar_web = req.body.publicar_web;
        if (publicar_web !== undefined) {
            publicar_web = publicar_web === 'true' || publicar_web === true;
        } else {
            publicar_web = false;
        }

        const eventoData = {
            titulo,
            descripcion,
            fecha,
            hora,
            lugar,
            tipo,
            creadoPor: req.usuario._id,
            imagenUrl,
            publicar_web
        };

        const hasUbicacion = lat !== undefined && lat !== null && lat !== '' && 
                            lng !== undefined && lng !== null && lng !== '';
        
        if (hasUbicacion) {
            eventoData.ubicacion = {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            };
        }

        const evento = await Evento.create(eventoData);

        // Notificar a todos los usuarios activos
        try {
            const usuariosActivos = await Usuario.find({ activo: true, expoPushToken: { $ne: null } });
            const tokens = usuariosActivos.map(u => u.expoPushToken);
            if (tokens.length > 0) {
                await enviarNotificacionGrupal(
                    tokens, 
                    `📅 Nuevo Evento Programado: ${titulo}`, 
                    `${lugar ? '📍 ' + lugar + ' - ' : ''}${new Date(fecha).toLocaleDateString()} a las ${hora}`,
                    { id: evento._id, tipo: 'evento' }
                );
            }
        } catch (pushErr) {
            console.error('Error enviando notificaciones para evento:', pushErr);
        }

        res.status(201).json({
            success: true,
            message: 'Evento creado exitosamente',
            evento
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: `Error al crear evento: ${error.message}`
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
            camposActualizar.imagenUrl = req.file.path;
        }

        if (req.body.lat && req.body.lng) {
            camposActualizar.ubicacion = {
                lat: parseFloat(req.body.lat),
                lng: parseFloat(req.body.lng)
            };
        }

        if (camposActualizar.publicar_web !== undefined) {
            camposActualizar.publicar_web = camposActualizar.publicar_web === 'true' || camposActualizar.publicar_web === true;
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
