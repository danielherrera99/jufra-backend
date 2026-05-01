const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Usuario = require('../models/Usuario');
const { generarToken } = require('../middleware/auth');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configurar Cloudinary con variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configurar almacenamiento de fotos de perfil en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'jufra_perfiles', // Carpeta en Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'],
    public_id: (req, file) => `perfil-${req.usuario._id}-${Date.now()}`,
  },
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

        // En Cloudinary, la URL segura viene en req.file.path
        const archivoUrl = req.file.path;

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
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }

        const { nombre, apellido, username, email, password, telefono, fechaNacimiento, contactoEmergencia, nombreContactoEmergencia } = req.body;

        // Verificar si el usuario ya existe por username o email
        const usuarioExiste = await Usuario.findOne({ 
            $or: [{ username }, { email }]
        });
        
        if (usuarioExiste) {
            if (usuarioExiste.username === username) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de usuario ya está en uso'
                });
            }
            if (usuarioExiste.email === email) {
                return res.status(400).json({
                    success: false,
                    message: 'El correo electrónico ya está registrado'
                });
            }
        }

        // Crear usuario
        const usuario = await Usuario.create({
            nombre,
            apellido,
            username,
            email: email || undefined, // Evitar guardar string vacío para que funcione sparse index
            password,
            telefono,
            fechaNacimiento,
            contactoEmergencia,
            nombreContactoEmergencia
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
            'fechaIngreso', 'fechaPromesa', 'foto', 'password',
            'contactoEmergencia', 'nombreContactoEmergencia', 'expoPushToken', 'email'
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

// @route   POST /api/auth/recuperar-password
// @desc    Enviar código de recuperación al correo
// @access  Public
router.post('/recuperar-password', async (req, res) => {
    try {
        const { usernameOrEmail } = req.body;
        if (!usernameOrEmail) {
            return res.status(400).json({ success: false, message: 'Por favor, proporciona un usuario o correo.' });
        }

        // Buscar por email o username
        const usuario = await Usuario.findOne({
            $or: [{ email: usernameOrEmail.toLowerCase() }, { username: usernameOrEmail }]
        });

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'No existe una cuenta con esa información.' });
        }

        if (!usuario.email) {
            return res.status(400).json({ success: false, message: 'Esta cuenta no tiene un correo registrado. Contacta al administrador.' });
        }

        // Generar código de 6 dígitos
        const crypto = require('crypto');
        const resetCode = crypto.randomInt(100000, 999999).toString();

        // Hashear el código antes de guardarlo por seguridad (opcional, pero buena práctica)
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        usuario.resetPasswordCode = await bcrypt.hash(resetCode, salt);
        usuario.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutos

        await usuario.save({ validateBeforeSave: false });

        // Enviar correo
        const nodemailer = require('nodemailer');
        
        // El transporter usa las variables de entorno configuradas
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'jufra.app@gmail.com',
                pass: process.env.EMAIL_PASS || 'tu-contrasena-de-aplicacion'
            }
        });

        const mensaje = `
            <h2>Recuperación de Contraseña - JUFRA</h2>
            <p>Hola ${usuario.nombre},</p>
            <p>Has solicitado restablecer tu contraseña. Utiliza el siguiente código de 6 dígitos en la aplicación:</p>
            <h1 style="background: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px; color: #624b2b;">${resetCode}</h1>
            <p>Este código expira en 15 minutos.</p>
            <p>Si no fuiste tú, puedes ignorar este correo.</p>
        `;

        try {
            await transporter.sendMail({
                from: `"JUFRA App" <${process.env.EMAIL_USER || 'jufra.app@gmail.com'}>`,
                to: usuario.email,
                subject: 'Código de Recuperación de Contraseña',
                html: mensaje
            });

            res.status(200).json({ success: true, message: 'Código enviado al correo electrónico registrado.' });
        } catch (err) {
            console.error('Error enviando email:', err);
            usuario.resetPasswordCode = undefined;
            usuario.resetPasswordExpire = undefined;
            await usuario.save({ validateBeforeSave: false });
            return res.status(500).json({ success: false, message: 'No se pudo enviar el correo. Verifica la configuración del servidor.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message });
    }
});

// @route   POST /api/auth/verificar-codigo
// @desc    Verificar que el código ingresado es correcto
// @access  Public
router.post('/verificar-codigo', async (req, res) => {
    try {
        const { usernameOrEmail, codigo } = req.body;
        if (!usernameOrEmail || !codigo) {
            return res.status(400).json({ success: false, message: 'Falta información.' });
        }

        const usuario = await Usuario.findOne({
            $or: [{ email: usernameOrEmail.toLowerCase() }, { username: usernameOrEmail }],
            resetPasswordExpire: { $gt: Date.now() }
        }).select('+resetPasswordCode');

        if (!usuario) {
            return res.status(400).json({ success: false, message: 'Código inválido o ha expirado.' });
        }

        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(codigo.toString(), usuario.resetPasswordCode);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Código incorrecto.' });
        }

        res.status(200).json({ success: true, message: 'Código verificado correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message });
    }
});

// @route   PUT /api/auth/reset-password
// @desc    Restablecer contraseña usando el código verificado
// @access  Public
router.put('/reset-password', async (req, res) => {
    try {
        const { usernameOrEmail, codigo, newPassword } = req.body;
        if (!usernameOrEmail || !codigo || !newPassword) {
            return res.status(400).json({ success: false, message: 'Faltan datos.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const usuario = await Usuario.findOne({
            $or: [{ email: usernameOrEmail.toLowerCase() }, { username: usernameOrEmail }],
            resetPasswordExpire: { $gt: Date.now() }
        }).select('+resetPasswordCode');

        if (!usuario) {
            return res.status(400).json({ success: false, message: 'Código inválido o expirado.' });
        }

        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(codigo.toString(), usuario.resetPasswordCode);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Código incorrecto.' });
        }

        // Si todo está bien, actualizar la contraseña
        usuario.password = newPassword; // El middleware pre-save hará el hash
        usuario.resetPasswordCode = undefined;
        usuario.resetPasswordExpire = undefined;
        await usuario.save();

        res.status(200).json({ success: true, message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message });
    }
});

module.exports = router;
