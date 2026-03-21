const express = require('express');
const router = express.Router();
const Mensaje = require('../models/Mensaje');
const Usuario = require('../models/Usuario');
const { proteger, autorizarRoles } = require('../middleware/auth');

// @route   GET /api/mensajes/conversaciones
// @desc    Obtener lista de usuarios con los que tengo conversaciones
// @access  Private
router.get('/conversaciones', proteger, async (req, res) => {
    try {
        const userId = req.usuario._id;

        // Encontrar todos los mensajes donde soy remitente o destinatario
        const mensajes = await Mensaje.find({
            $or: [{ remitente: userId }, { destinatario: userId }]
        }).sort({ createdAt: -1 });

        const usuariosMap = new Map();

        for (const msg of mensajes) {
            const otroUsuarioId = msg.remitente.toString() === userId.toString()
                ? msg.destinatario.toString()
                : msg.remitente.toString();

            if (!usuariosMap.has(otroUsuarioId)) {
                usuariosMap.set(otroUsuarioId, {
                    ultimoMensaje: msg,
                    usuarioId: otroUsuarioId
                });
            }
        }

        const conversaciones = [];
        for (const [id, data] of usuariosMap) {
            const usuario = await Usuario.findById(id).select('nombre apellido foto cargo');
            if (usuario) {
                conversaciones.push({
                    usuario,
                    ultimoMensaje: data.ultimoMensaje
                });
            }
        }

        res.json({ success: true, conversaciones });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener conversaciones' });
    }
});

// @route   GET /api/mensajes/:usuarioId
// @desc    Obtener mensajes con un usuario específico
// @access  Private
router.get('/:usuarioId', proteger, async (req, res) => {
    try {
        const miId = req.usuario._id;
        const otroId = req.params.usuarioId;

        const mensajes = await Mensaje.find({
            $or: [
                { remitente: miId, destinatario: otroId },
                { remitente: otroId, destinatario: miId }
            ]
        })
            .sort({ createdAt: 1 })
            .populate('remitente', 'nombre apellido')
            .populate('destinatario', 'nombre apellido');

        // Marcar como leídos los mensajes recibidos
        await Mensaje.updateMany(
            { remitente: otroId, destinatario: miId, leido: false },
            { leido: true }
        );

        res.json({ success: true, mensajes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener mensajes' });
    }
});

// @route   POST /api/mensajes
// @desc    Enviar un mensaje
// @access  Private
router.post('/', proteger, async (req, res) => {
    try {
        const { destinatarioId, contenido } = req.body;

        const mensaje = await Mensaje.create({
            remitente: req.usuario._id,
            destinatario: destinatarioId,
            contenido
        });

        const mensajePoblado = await Mensaje.findById(mensaje._id)
            .populate('remitente', 'nombre apellido')
            .populate('destinatario', 'nombre apellido');

        res.status(201).json({ success: true, mensaje: mensajePoblado });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al enviar mensaje' });
    }
});

// @route   GET /api/mensajes/admin/todas
// @desc    Obtener TODAS las conversaciones del sistema (Admin solamente)
// @access  Private (Admin/Consejo)
router.get('/admin/todas', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const mensajes = await Mensaje.find()
            .sort({ createdAt: -1 })
            .populate('remitente', 'nombre apellido foto cargo')
            .populate('destinatario', 'nombre apellido foto cargo');

        const conversacionesMap = new Map();

        for (const msg of mensajes) {
            if (!msg.remitente || !msg.destinatario) continue;
            const ids = [msg.remitente._id.toString(), msg.destinatario._id.toString()].sort();
            const key = ids.join('-');

            if (!conversacionesMap.has(key)) {
                conversacionesMap.set(key, {
                    usuario1: msg.remitente,
                    usuario2: msg.destinatario,
                    ultimoMensaje: msg,
                    count: 1
                });
            } else {
                conversacionesMap.get(key).count++;
            }
        }

        const conversaciones = Array.from(conversacionesMap.values());
        res.json({ success: true, conversaciones });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener todas las conversaciones' });
    }
});

// @route   GET /api/mensajes/admin/chat/:user1Id/:user2Id
// @desc    Obtener mensajes entre dos usuarios cualesquiera (Admin solamente)
// @access  Private (Admin/Consejo)
router.get('/admin/chat/:user1Id/:user2Id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const { user1Id, user2Id } = req.params;

        const mensajes = await Mensaje.find({
            $or: [
                { remitente: user1Id, destinatario: user2Id },
                { remitente: user2Id, destinatario: user1Id }
            ]
        })
            .sort({ createdAt: 1 })
            .populate('remitente', 'nombre apellido')
            .populate('destinatario', 'nombre apellido');

        res.json({ success: true, mensajes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener mensajes de la conversación' });
    }
});

module.exports = router;
