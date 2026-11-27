const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Usuario = require('../models/Usuario');
const Fraternidad = require('../models/Fraternidad');
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

        // Determinar fraternidad asignada (Pomalca por defecto)
        let fraternidadIdToAssign = req.body.fraternidadId || req.body.fraternidad_id;
        if (!fraternidadIdToAssign) {
            const pomalca = await Fraternidad.findOne({ nombre: 'JUFRA POMALCA' });
            if (pomalca) fraternidadIdToAssign = pomalca._id || pomalca.id;
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
            nombreContactoEmergencia,
            fraternidadId: fraternidadIdToAssign
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
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }

        let { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos'
            });
        }

        username = String(username).trim();
        password = String(password);

        // Verificar si el usuario existe (sensible a mayúsculas/minúsculas)
        const isEmail = username.includes('@');
        let usuario = null;
        if (isEmail) {
            usuario = await Usuario.findOne({ email: username.toLowerCase() });
        } else {
            usuario = await Usuario.findOne({ username });
            if (!usuario) {
                // Fallback case-insensitive
                const db = require('../db');
                const rawUser = await db('usuarios').whereRaw('LOWER(username) = ?', [username.toLowerCase()]).first();
                if (rawUser) {
                    usuario = Usuario.fromPostgres(rawUser);
                }
            }
        }

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

        // Obtener datos de la fraternidad asignada
        let fraternidadData = null;
        const fratId = usuario.fraternidadId || usuario.fraternidad_id;
        if (fratId) {
            try {
                fraternidadData = await Fraternidad.findById(fratId);
            } catch (fErr) {}
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
                foto: usuario.foto,
                codigoQR: usuario.codigoQR,
                fraternidadId: fratId || null,
                fraternidadNombre: fraternidadData ? fraternidadData.nombre : null,
                fraternidadZona: fraternidadData ? fraternidadData.zona : null,
                isSuperAdmin: usuario.rol === 'superadmin' || usuario.rol === 'admin_nacional'
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
                if (['fechaNacimiento', 'fechaIngreso', 'fechaPromesa', 'email'].includes(campo)) {
                    if (valor === '' || valor === null) {
                        // Para evitar el error E11000 en el índice sparse unique de email
                        if (campo === 'email') {
                            usuario[campo] = undefined;
                        } else {
                            usuario[campo] = null;
                        }
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
        let { usernameOrEmail } = req.body;
        if (!usernameOrEmail) {
            return res.status(400).json({ success: false, message: 'Por favor, proporciona un usuario o correo.' });
        }

        const query = usernameOrEmail.toString().trim();
        const isEmail = query.includes('@');
        let usuario = null;

        if (isEmail) {
            usuario = await Usuario.findOne({ email: query.toLowerCase() });
        } else {
            usuario = await Usuario.findOne({ username: query });
            if (!usuario) {
                const db = require('../db');
                const rawUser = await db('usuarios').whereRaw('LOWER(username) = ?', [query.toLowerCase()]).first();
                if (rawUser) {
                    usuario = Usuario.fromPostgres(rawUser);
                }
            }
        }

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'No existe una cuenta con esa información.' });
        }

        if (!usuario.email) {
            return res.status(400).json({ success: false, message: 'Esta cuenta no tiene un correo registrado. Contacta al administrador.' });
        }

        // Generar código de 6 dígitos
        const crypto = require('crypto');
        const resetCode = crypto.randomInt(100000, 999999).toString();

        // Hashear el código antes de guardarlo por seguridad
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        usuario.resetPasswordCode = await bcrypt.hash(resetCode.toString(), salt);
        usuario.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        await usuario.save({ validateBeforeSave: false });

        const mensajeHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Recuperación - JUFRA</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #f1f5f9;">
          <tr>
            <td style="background: linear-gradient(135deg, #451a03 0%, #78350f 50%, #9a3412 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: rgba(255, 255, 255, 0.15); border-radius: 50%; font-size: 24px; color: #fef3c7; font-weight: bold; margin-bottom: 8px;">
                &#10013;
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">JUFRA Pomalca</h1>
              <p style="margin: 4px 0 0; color: #fed7aa; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Juventud Franciscana del Perú</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 19px; font-weight: 700;">Restablecer tu Contraseña</h2>
              <p style="margin: 0 0 16px; color: #475569; font-size: 14.5px; line-height: 1.6;">
                ¡Paz y Bien, hermano(a) <strong>${usuario.nombre || 'Hermano'}</strong>!
              </p>
              <p style="margin: 0 0 24px; color: #475569; font-size: 14.5px; line-height: 1.6;">
                Has solicitado restablecer el acceso a tu cuenta fraterna. Utiliza el siguiente código de verificación de 6 dígitos para continuar:
              </p>

              <div style="background: #fff7ed; border: 2px dashed #ea580c; border-radius: 12px; padding: 20px 16px; text-align: center; margin: 0 0 24px;">
                <span style="font-size: 11.5px; font-weight: 700; color: #9a3412; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">Tu Código de Verificación</span>
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #7c2d12; letter-spacing: 8px; display: inline-block;">${resetCode}</span>
              </div>

              <div style="background: #f8fafc; border-left: 4px solid #ea580c; padding: 12px 16px; border-radius: 4px 8px 8px 4px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                  ⏳ <strong>Importante:</strong> Este código expira en <strong>15 minutos</strong> y es de un solo uso.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                Si tú no solicitaste este cambio, puedes ignorar este mensaje de forma segura. Tu cuenta y contraseña actual permanecen protegidas.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #64748b;">Parroquia Ntra. Sra. del Perpetuo Socorro · Pomalca</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">© 2026 JUFRA Pomalca · Paz y Bien</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        // 1. Intentar PRIMERO con Gmail Nodemailer (Puerto 465 SSL Directo - Máxima confiabilidad)
        const emailPass = process.env.EMAIL_PASS || 'gglvrdhmydjlnocq';
        const emailUser = process.env.EMAIL_USER || 'jufrapomalca@gmail.com';

        if (emailPass && emailUser) {
            try {
                const nodemailer = require('nodemailer');
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true,
                    auth: {
                        user: emailUser,
                        pass: emailPass
                    }
                });

                await transporter.sendMail({
                    from: `"JUFRA Pomalca" <${emailUser}>`,
                    to: usuario.email,
                    subject: `Código de Recuperación: ${resetCode} - JUFRA`,
                    html: mensajeHtml
                });

                return res.status(200).json({ success: true, message: 'Código enviado al correo electrónico registrado.' });
            } catch (gmailErr) {
                console.error('Error enviando con Gmail SSL:', gmailErr.message);
            }
        }

        // 2. Fallback a Brevo API si Gmail falla
        if (process.env.BREVO_API_KEY) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);

                const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'api-key': process.env.BREVO_API_KEY,
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        sender: {
                            name: 'JUFRA Pomalca',
                            email: emailUser
                        },
                        to: [{ email: usuario.email, name: usuario.nombre }],
                        subject: `Código de Recuperación: ${resetCode} - JUFRA`,
                        htmlContent: mensajeHtml
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    return res.status(200).json({ success: true, message: 'Código enviado al correo electrónico registrado.' });
                }
            } catch (brevoErr) {
                console.warn('Error con Brevo API fallback:', brevoErr.message);
            }
        }

        // Si ambos fallaron
        usuario.resetPasswordCode = undefined;
        usuario.resetPasswordExpire = undefined;
        await usuario.save({ validateBeforeSave: false });

        return res.status(500).json({ 
            success: false, 
            message: 'No se pudo despachar el correo en este momento. Por favor contacta al consejo por WhatsApp.' 
        });
    } catch (error) {
        console.error('Error en recuperar-password:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor al enviar código', error: error.message });
    }
});

// @route   POST /api/auth/verificar-codigo
// @desc    Verificar que el código ingresado es correcto
// @access  Public
router.post('/verificar-codigo', async (req, res) => {
    try {
        let { usernameOrEmail, codigo } = req.body;
        if (!usernameOrEmail || !codigo) {
            return res.status(400).json({ success: false, message: 'Falta información.' });
        }

        const query = usernameOrEmail.toString().trim();
        const isEmail = query.includes('@');
        let usuario = null;

        if (isEmail) {
            usuario = await Usuario.findOne({
                email: query.toLowerCase(),
                resetPasswordExpire: { $gt: new Date() }
            });
        } else {
            usuario = await Usuario.findOne({
                username: query,
                resetPasswordExpire: { $gt: new Date() }
            });
            if (!usuario) {
                const db = require('../db');
                const rawUser = await db('usuarios')
                    .whereRaw('LOWER(username) = ?', [query.toLowerCase()])
                    .where('reset_password_expire', '>', new Date())
                    .first();
                if (rawUser) usuario = Usuario.fromPostgres(rawUser);
            }
        }

        if (!usuario || !usuario.resetPasswordCode) {
            return res.status(400).json({ success: false, message: 'Código inválido o ha expirado.' });
        }

        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(codigo.toString().trim(), usuario.resetPasswordCode);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Código incorrecto.' });
        }

        res.status(200).json({ success: true, message: 'Código verificado correctamente.' });
    } catch (error) {
        console.error('Error en verificar-codigo:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor al verificar código', error: error.message });
    }
});

// @route   PUT /api/auth/reset-password
// @desc    Restablecer contraseña usando el código verificado
// @access  Public
router.put('/reset-password', async (req, res) => {
    try {
        let { usernameOrEmail, codigo, newPassword } = req.body;
        if (!usernameOrEmail || !codigo || !newPassword) {
            return res.status(400).json({ success: false, message: 'Faltan datos.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const query = usernameOrEmail.toString().trim();
        const isEmail = query.includes('@');
        let usuario = null;

        if (isEmail) {
            usuario = await Usuario.findOne({
                email: query.toLowerCase(),
                resetPasswordExpire: { $gt: new Date() }
            });
        } else {
            usuario = await Usuario.findOne({
                username: query,
                resetPasswordExpire: { $gt: new Date() }
            });
            if (!usuario) {
                const db = require('../db');
                const rawUser = await db('usuarios')
                    .whereRaw('LOWER(username) = ?', [query.toLowerCase()])
                    .where('reset_password_expire', '>', new Date())
                    .first();
                if (rawUser) usuario = Usuario.fromPostgres(rawUser);
            }
        }

        if (!usuario || !usuario.resetPasswordCode) {
            return res.status(400).json({ success: false, message: 'Código inválido o expirado.' });
        }

        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(codigo.toString().trim(), usuario.resetPasswordCode);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Código incorrecto.' });
        }

        // Actualizar la contraseña
        usuario.password = newPassword;
        usuario.resetPasswordCode = null;
        usuario.resetPasswordExpire = null;
        usuario.reset_password_code = null;
        usuario.reset_password_expire = null;
        await usuario.save();

        res.status(200).json({ success: true, message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error('Error en reset-password:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor al restablecer contraseña', error: error.message });
    }
});

module.exports = router;
