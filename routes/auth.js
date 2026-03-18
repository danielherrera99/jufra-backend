const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Usuario = require('../models/Usuario');
const { generarToken } = require('../middleware/auth');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar almacenamiento de fotos de perfil
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/perfiles';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, `perfil-${req.usuario._id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Formato de archivo no soportado. Solo imágenes.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

// @route   POST /api/auth/foto
// @desc    Subir foto de perfil
// @access  Private
router.post('/foto', require('../middleware/auth').proteger, upload.single('foto'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Por favor sube una imagen'
            });
        }

        const archivoUrl = `${req.protocol}://${req.get('host')}/uploads/perfiles/${req.file.filename}`;

        const usuario = await Usuario.findById(req.usuario._id);
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        usuario.foto = archivoUrl;
        await usuario.save();

        res.status(200).json({
            success: true,
            message: 'Foto de perfil actualizada correctamente',
            foto: archivoUrl
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al subir foto de perfil',
            error: error.message
        });
    }
});

// @route   POST /api/auth/registro
// @desc    Registrar nuevo usuario
// @access  Public
router.post('/registro', [
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('apellido').notEmpty().withMessage('El apellido es requerido'),
    body('username').notEmpty().withMessage('El usuario es requerido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
    try {
        const { nombre, apellido, username, email, password, telefono, fechaNacimiento } = req.body;

        // Verificar si el usuario ya existe
        const usuarioExiste = await Usuario.findOne({ username });
        if (usuarioExiste) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario ya está en uso'
            });
        }

        // Crear usuario
        const usuario = await Usuario.create({
            nombre,
            apellido,
            username,
            email: email || undefined, // Evitar guardar string vacío para que funcione sparse index
            password,
            telefono,
            fechaNacimiento
        });

        // Generar código QR para el usuario
        const qrData = JSON.stringify({
            id: usuario._id,
            nombre: usuario.nombreCompleto,
            username: usuario.username
        });

        const qrCode = await QRCode.toDataURL(qrData);
        usuario.codigoQR = qrCode;
        await usuario.save();

        // No generamos token porque el usuario debe ser aprobado primero

        res.status(201).json({
            success: true,
            message: 'Registro exitoso. Tu cuenta está pendiente de aprobación por el Consejo.',
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                username: usuario.username
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar usuario',
            error: error.message
        });
    }
});

// @route   POST /api/auth/login
// @desc    Iniciar sesión
// @access  Public
router.post('/login', [
    body('username').notEmpty().withMessage('El usuario es requerido'),
    body('password').notEmpty().withMessage('La contraseña es requerida')
], async (req, res) => {
    try {
        const { username, password } = req.body;

        // Verificar si el usuario existe (sensible a mayúsculas/minúsculas)
        const usuario = await Usuario.findOne({ username }).select('+password');

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar contraseña
        const passwordCorrecto = await usuario.compararPassword(password);
        if (!passwordCorrecto) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar si el usuario está activo
        if (!usuario.activo) {
            return res.status(401).json({
                success: false,
                message: 'Tu cuenta está pendiente de aprobación o ha sido desactivada. Contacta al Consejo.'
            });
        }

        // Generar QR si no existe (Self-healing)
        if (!usuario.codigoQR) {
            try {
                const qrData = JSON.stringify({
                    id: usuario._id,
                    nombre: usuario.nombreCompleto || `${usuario.nombre} ${usuario.apellido}`,
                    username: usuario.username
                });
                usuario.codigoQR = await QRCode.toDataURL(qrData);
                await usuario.save();
            } catch (qrError) {
                console.error('Error generando QR en login:', qrError);
            }
        }

        // Generar token
        const token = generarToken(usuario._id);

        res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                username: usuario.username,
                email: usuario.email,
                rol: usuario.rol,
                cargo: usuario.cargo,
                etapaFormacion: usuario.etapaFormacion,
                foto: usuario.foto,
                codigoQR: usuario.codigoQR
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión',
            error: error.message
        });
    }
});

// @route   GET /api/auth/perfil
// @desc    Obtener perfil del usuario autenticado
// @access  Private
router.get('/perfil', require('../middleware/auth').proteger, async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario._id);

        // Generar QR si no existe (Self-healing)
        if (usuario && !usuario.codigoQR) {
            try {
                const qrData = JSON.stringify({
                    id: usuario._id,
                    nombre: usuario.nombreCompleto || `${usuario.nombre} ${usuario.apellido}`,
                    username: usuario.username
                });
                usuario.codigoQR = await QRCode.toDataURL(qrData);
                await usuario.save();
            } catch (qrError) {
                console.error('Error generando QR en perfil:', qrError);
            }
        }

        res.status(200).json({
            success: true,
            usuario
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener perfil',
            error: error.message
        });
    }
});

// @route   PUT /api/auth/perfil
// @desc    Actualizar perfil del usuario autenticado
// @access  Private
router.put('/perfil', require('../middleware/auth').proteger, async (req, res) => {
    try {
        const camposPermitidos = [
            'nombre', 'apellido', 'telefono', 'fechaNacimiento',
            'fechaIngreso', 'fechaPromesa', 'foto', 'password'
        ];

        let usuario = await Usuario.findById(req.usuario._id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        camposPermitidos.forEach(campo => {
            const valor = req.body[campo];
            if (valor !== undefined) {
                // Si es password, solo actualizar si tiene contenido y longitud válida
                if (campo === 'password') {
                    if (valor && valor.trim().length >= 6) {
                        usuario[campo] = valor;
                    }
                    return;
                }

                // Campos obligatorios: no permitir vacíos
                if (['nombre', 'apellido'].includes(campo) && (!valor || valor.trim() === '')) {
                    return;
                }

                // Campos opcionales: permitir vacíos (convertir a null si es fecha o string vacío)
                if (['fechaNacimiento', 'fechaIngreso', 'fechaPromesa'].includes(campo)) {
                    if (valor === '' || valor === null) {
                        usuario[campo] = null;
                    } else {
                        usuario[campo] = valor;
                    }
                } else {
                    // Otros campos (telefono, foto)
                    usuario[campo] = valor;
                }
            }
        });

        await usuario.save();

        // Devolver usuario sin password
        usuario = await Usuario.findById(req.usuario._id).select('-password');

        res.status(200).json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            usuario
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar perfil',
            error: error.message
        });
    }
});

module.exports = router;
