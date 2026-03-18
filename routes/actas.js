const express = require('express');
const router = express.Router();
const Acta = require('../models/Acta');
const { proteger, autorizarRoles } = require('../middleware/auth');

// @route   POST /api/actas
// @desc    Crear nueva acta
// @access  Private (Admin/Consejo)
router.post('/', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const { titulo, fecha, tipoReunion, contenido, asistentes, acuerdos } = req.body;

        const acta = await Acta.create({
            titulo,
            fecha: fecha || new Date(),
            tipoReunion,
            contenido,
            asistentes,
            acuerdos,
            creadoPor: req.usuario._id
        });

        await acta.populate('asistentes', 'nombre apellido foto');
        await acta.populate('acuerdos.responsable', 'nombre apellido');
        await acta.populate('creadoPor', 'nombre apellido');

        res.status(201).json({
            success: true,
            message: 'Acta creada exitosamente',
            acta
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al crear acta',
            error: error.message
        });
    }
});

// @route   GET /api/actas
// @desc    Obtener todas las actas
// @access  Private
router.get('/', proteger, async (req, res) => {
    try {
        const { tipoReunion, fechaInicio, fechaFin } = req.query;

        // Construir filtro
        const filtro = {};
        if (tipoReunion) filtro.tipoReunion = tipoReunion;
        if (fechaInicio || fechaFin) {
            filtro.fecha = {};
            if (fechaInicio) filtro.fecha.$gte = new Date(fechaInicio);
            if (fechaFin) filtro.fecha.$lte = new Date(fechaFin);
        }

        const actas = await Acta.find(filtro)
            .populate('asistentes', 'nombre apellido foto')
            .populate('acuerdos.responsable', 'nombre apellido')
            .populate('creadoPor', 'nombre apellido')
            .sort({ fecha: -1 });

        res.status(200).json({
            success: true,
            count: actas.length,
            actas
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener actas',
            error: error.message
        });
    }
});

// @route   GET /api/actas/:id
// @desc    Obtener un acta por ID
// @access  Private
router.get('/:id', proteger, async (req, res) => {
    try {
        const acta = await Acta.findById(req.params.id)
            .populate('asistentes', 'nombre apellido foto')
            .populate('acuerdos.responsable', 'nombre apellido')
            .populate('creadoPor', 'nombre apellido');

        if (!acta) {
            return res.status(404).json({
                success: false,
                message: 'Acta no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            acta
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener acta',
            error: error.message
        });
    }
});

// @route   PUT /api/actas/:id
// @desc    Actualizar acta
// @access  Private (Admin/Consejo)
router.put('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const acta = await Acta.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('asistentes', 'nombre apellido foto')
            .populate('acuerdos.responsable', 'nombre apellido')
            .populate('creadoPor', 'nombre apellido');

        if (!acta) {
            return res.status(404).json({
                success: false,
                message: 'Acta no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Acta actualizada exitosamente',
            acta
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar acta',
            error: error.message
        });
    }
});

// @route   PUT /api/actas/:id/acuerdos/:acuerdoId
// @desc    Marcar acuerdo como completado
// @access  Private
router.put('/:id/acuerdos/:acuerdoId', proteger, async (req, res) => {
    try {
        const acta = await Acta.findById(req.params.id);

        if (!acta) {
            return res.status(404).json({
                success: false,
                message: 'Acta no encontrada'
            });
        }

        const acuerdo = acta.acuerdos.id(req.params.acuerdoId);
        if (!acuerdo) {
            return res.status(404).json({
                success: false,
                message: 'Acuerdo no encontrado'
            });
        }

        acuerdo.completado = req.body.completado;
        await acta.save();

        await acta.populate('asistentes', 'nombre apellido foto');
        await acta.populate('acuerdos.responsable', 'nombre apellido');

        res.status(200).json({
            success: true,
            message: 'Acuerdo actualizado exitosamente',
            acta
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar acuerdo',
            error: error.message
        });
    }
});

// @route   DELETE /api/actas/:id
// @desc    Eliminar acta
// @access  Private (Admin)
router.delete('/:id', proteger, autorizarRoles('admin'), async (req, res) => {
    try {
        const acta = await Acta.findByIdAndDelete(req.params.id);

        if (!acta) {
            return res.status(404).json({
                success: false,
                message: 'Acta no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Acta eliminada exitosamente'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar acta',
            error: error.message
        });
    }
});

module.exports = router;
