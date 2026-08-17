const express = require('express');
const router = express.Router();
const Anuncio = require('../models/Anuncio');
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
    folder: 'jufra_anuncios',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    public_id: (req, file) => `anuncio-${Date.now()}`,
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

// @route   POST /api/anuncios
// @desc    Crear nuevo anuncio
// @access  Private (Admin/Consejo)
router.post('/', proteger, autorizarRoles('admin', 'consejo'), upload.single('imagen'), async (req, res) => {
    try {
        const { titulo, contenido, tipo, prioridad, fechaExpiracion, destacado, destinatarios, lat, lng } = req.body;

        let imagen = null;
        if (req.file) {
            imagen = req.file.path;
        } else if (req.body.imagen) {
            // Handle case where image URL is passed directly (though less common with file upload)
            imagen = req.body.imagen;
        }

        const anuncioData = {
            titulo,
            contenido,
            tipo,
            prioridad,
            imagen,
            fechaExpiracion,
            destacado,
            destinatarios,
            autor: req.usuario._id
        };

        const hasUbicacion = lat !== undefined && lat !== null && lat !== '' && 
                            lng !== undefined && lng !== null && lng !== '';
                            
        if (hasUbicacion) {
            anuncioData.ubicacion = {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            };
        }

        const anuncio = await Anuncio.create(anuncioData);

        await anuncio.populate('autor', 'nombre apellido cargo');

        // Notificar a todos los usuarios activos a través de Push Notifications
        try {
            const usuariosActivos = await Usuario.find({ activo: true, expoPushToken: { $ne: null } });
            const tokens = usuariosActivos.map(u => u.expoPushToken);
            if (tokens.length > 0) {
                const badgeStr = prioridad === 'alta' ? '🚨' : '📢';
                await enviarNotificacionGrupal(
                    tokens, 
                    `${badgeStr} Nuevo Anuncio: ${titulo}`, 
                    contenido.length > 60 ? contenido.substring(0, 60) + '...' : contenido,
                    { id: anuncio._id, tipo: 'anuncio' }
                );
            }
        } catch (pushErr) {
            console.error('Error enviando notificaciones para anuncio:', pushErr);
        }

        res.status(201).json({
            success: true,
            message: 'Anuncio creado exitosamente',
            anuncio
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: `Error al crear anuncio: ${error.message}`,
            error: error.message
        });
    }
});

// @route   GET /api/anuncios
// @desc    Obtener todos los anuncios activos
// @access  Private
router.get('/', proteger, async (req, res) => {
    try {
        const { tipo, prioridad, destacado, destinatarios } = req.query;

        // Construir filtro
        const filtro = { activo: true };

        if (tipo) filtro.tipo = tipo;
        if (prioridad) filtro.prioridad = prioridad;
        if (destacado !== undefined) filtro.destacado = destacado === 'true';
        if (destinatarios) filtro.destinatarios = destinatarios;

        // Filtrar anuncios no expirados
        filtro.$or = [
            { fechaExpiracion: null },
            { fechaExpiracion: { $gt: new Date() } }
        ];

        const anuncios = await Anuncio.find(filtro)
            .populate('autor', 'nombre apellido cargo foto')
            .sort({ destacado: -1, prioridad: -1, fechaPublicacion: -1 });

        res.status(200).json({
            success: true,
            count: anuncios.length,
            anuncios
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener anuncios',
            error: error.message
        });
    }
});

// @route   GET /api/anuncios/destacados
// @desc    Obtener anuncios destacados
// @access  Private
router.get('/destacados', proteger, async (req, res) => {
    try {
        const anuncios = await Anuncio.find({
            activo: true,
            destacado: true,
            $or: [
                { fechaExpiracion: null },
                { fechaExpiracion: { $gt: new Date() } }
            ]
        })
            .populate('autor', 'nombre apellido cargo foto')
            .sort({ prioridad: -1, fechaPublicacion: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            count: anuncios.length,
            anuncios
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener anuncios destacados',
            error: error.message
        });
    }
});

// @route   GET /api/anuncios/:id
// @desc    Obtener un anuncio por ID
// @access  Private
router.get('/:id', proteger, async (req, res) => {
    try {
        const anuncio = await Anuncio.findById(req.params.id)
            .populate('autor', 'nombre apellido cargo foto');

        if (!anuncio) {
            return res.status(404).json({
                success: false,
                message: 'Anuncio no encontrado'
            });
        }

        // Incrementar vistas
        await anuncio.incrementarVistas();

        res.status(200).json({
            success: true,
            anuncio
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener anuncio',
            error: error.message
        });
    }
});

// @route   PUT /api/anuncios/:id
// @desc    Actualizar anuncio
// @access  Private (Admin/Consejo)
router.put('/:id', proteger, autorizarRoles('admin', 'consejo'), upload.single('imagen'), async (req, res) => {
    try {
        const camposActualizar = { ...req.body };

        if (req.file) {
            camposActualizar.imagen = req.file.path;
        }

        if (req.body.lat && req.body.lng) {
            camposActualizar.ubicacion = {
                lat: parseFloat(req.body.lat),
                lng: parseFloat(req.body.lng)
            };
        }

        const anuncio = await Anuncio.findByIdAndUpdate(
            req.params.id,
            camposActualizar,
            { new: true, runValidators: true }
        );

        if (!anuncio) {
            return res.status(404).json({
                success: false,
                message: 'Anuncio no encontrado'
            });
        }

        if (anuncio.populate) {
            await anuncio.populate('autor', 'nombre apellido cargo foto');
        }



        res.status(200).json({
            success: true,
            message: 'Anuncio actualizado exitosamente',
            anuncio
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar anuncio',
            error: error.message
        });
    }
});

// @route   DELETE /api/anuncios/:id
// @desc    Eliminar anuncio (soft delete)
// @access  Private (Admin)
router.delete('/:id', proteger, autorizarRoles('admin'), async (req, res) => {
    try {
        const anuncio = await Anuncio.findByIdAndUpdate(
            req.params.id,
            { activo: false },
            { new: true }
        );

        if (!anuncio) {
            return res.status(404).json({
                success: false,
                message: 'Anuncio no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Anuncio eliminado exitosamente'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar anuncio',
            error: error.message
        });
    }
});

// @route   GET /api/anuncios/estadisticas/general
// @desc    Obtener estadísticas de anuncios
// @access  Private (Admin/Consejo)
router.get('/estadisticas/general', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const totalAnuncios = await Anuncio.countDocuments({ activo: true });
        const anunciosDestacados = await Anuncio.countDocuments({ activo: true, destacado: true });

        const porTipo = await Anuncio.aggregate([
            { $match: { activo: true } },
            {
                $group: {
                    _id: '$tipo',
                    total: { $sum: 1 },
                    vistasTotal: { $sum: '$vistas' }
                }
            },
            { $sort: { total: -1 } }
        ]);

        const masVistos = await Anuncio.find({ activo: true })
            .sort({ vistas: -1 })
            .limit(5)
            .populate('autor', 'nombre apellido');

        res.status(200).json({
            success: true,
            estadisticas: {
                totalAnuncios,
                anunciosDestacados,
                porTipo,
                masVistos
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
});

module.exports = router;
