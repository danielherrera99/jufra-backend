const express = require('express');
const router = express.Router();
const Solicitud = require('../models/Solicitud');
const { proteger, autorizarRoles } = require('../middleware/auth');

// @route   POST /api/solicitudes
// @desc    Crear una nueva solicitud (Público, desde la web)
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { nombre, edad, telefono } = req.body;
        
        if (!nombre || !edad || !telefono) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
        }

        const nuevaSolicitud = await Solicitud.create({
            nombre,
            edad,
            telefono
        });

        res.status(201).json({ success: true, data: nuevaSolicitud });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear la solicitud' });
    }
});

// @route   GET /api/solicitudes
// @desc    Obtener todas las solicitudes
// @access  Private (Admin/Consejo)
router.get('/', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const solicitudes = await Solicitud.find().sort({ createdAt: -1 });
        res.json({ success: true, solicitudes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener solicitudes' });
    }
});

// @route   PUT /api/solicitudes/:id
// @desc    Actualizar el estado de la solicitud
// @access  Private (Admin/Consejo)
router.put('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const { estado } = req.body;
        
        let solicitud = await Solicitud.findById(req.params.id);
        if (!solicitud) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        if (estado) solicitud.estado = estado;
        await solicitud.save();

        res.json({ success: true, data: solicitud });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar la solicitud' });
    }
});

// @route   DELETE /api/solicitudes/:id
// @desc    Eliminar una solicitud
// @access  Private (Admin/Consejo)
router.delete('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const solicitud = await Solicitud.findById(req.params.id);
        if (!solicitud) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        await solicitud.deleteOne();
        res.json({ success: true, data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar la solicitud' });
    }
});

module.exports = router;
