const express = require('express');
const router = express.Router();
const Acta = require('../models/Acta');
const { proteger, autorizarRoles } = require('../middleware/auth');
const { uploadPdfToDrive } = require('../utils/drive');
const { generarActaPDF } = require('../utils/pdfGenerator');

// Constante de identificación oficial de Jufra Pomalca
const JUFRA_POMALCA_ID = '00000000-6a0f-b53a-d327-e42a6db2faf7';

// @route   POST /api/actas
// @desc    Crear nueva acta
// @access  Private (Admin/Consejo)
router.post('/', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const { titulo, fecha, tipoReunion, contenido, asistentes, acuerdos } = req.body;

        // Determinar la fraternidad del acta:
        // Si es SuperAdmin, puede especificar fraternidadId en el body, sino usa la suya o Pomalca por defecto
        const esSuperAdmin = req.usuario.rol === 'superadmin' || req.usuario.rol === 'admin_nacional';
        let targetFraternidadId = (esSuperAdmin && req.body.fraternidadId) 
            ? req.body.fraternidadId 
            : (req.usuario.fraternidadId || req.usuario.fraternidad_id || JUFRA_POMALCA_ID);

        const acta = await Acta.create({
            titulo,
            fecha: fecha || new Date(),
            tipoReunion,
            contenido,
            asistentes,
            acuerdos,
            creadoPor: req.usuario._id,
            fraternidadId: targetFraternidadId
        });

        await acta.populate('asistentes', 'nombre apellido foto');
        await acta.populate('acuerdos.responsable', 'nombre apellido');
        await acta.populate('creadoPor', 'nombre apellido');

        // --- Generar PDF y subir a Google Drive (EXCLUSIVO PARA JUFRA POMALCA) ---
        // IMPORTANTE: El Drive actual pertenece exclusivamente a la cuenta de Jufra Pomalca.
        // Las actas de otras fraternidades NO se subirán a este Drive hasta que configuren el suyo propio.
        try {
            const isPomalca = String(targetFraternidadId) === JUFRA_POMALCA_ID;

            if (isPomalca) {
                const pdfBuffer = await generarActaPDF(acta);
                // Nombre del archivo: Acta - [Fecha] - [Titulo]
                const fechaLimpia = new Date(acta.fecha).toISOString().split('T')[0];
                const safeTitle = acta.titulo.replace(/[^a-zA-Z0-9]/g, '_');
                const pdfFileName = `Acta_${fechaLimpia}_${safeTitle}.pdf`;
                
                const driveLink = await uploadPdfToDrive(pdfBuffer, pdfFileName, 'actas');
                
                // Actualizar el acta con el link
                acta.archivoPDF = driveLink;
                await acta.save();
            } else {
                console.log(`[Drive] ℹ️ Subida a Google Drive omitida: La fraternidad "${targetFraternidadId}" no tiene Drive propio configurado (el Drive actual es exclusivo de Jufra Pomalca).`);
            }
        } catch (uploadError) {
            console.error('Error al generar o subir PDF de acta:', uploadError);
            // No bloqueamos la respuesta, el acta se creo exitosamente de todas formas.
        }

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

        // Filtro Multi-Tenant:
        const esSuperAdmin = req.usuario.rol === 'superadmin' || req.usuario.rol === 'admin_nacional';
        if (esSuperAdmin) {
            if (req.query.fraternidadId) {
                filtro.fraternidadId = req.query.fraternidadId;
            }
        } else {
            const fratId = req.usuario.fraternidadId || req.usuario.fraternidad_id;
            if (fratId) {
                filtro.fraternidadId = fratId;
            }
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
        );

        if (!acta) {
            return res.status(404).json({
                success: false,
                message: 'Acta no encontrada'
            });
        }

        if (acta.populate) {
            await acta.populate('asistentes', 'nombre apellido foto');
            await acta.populate('acuerdos.responsable', 'nombre apellido');
            await acta.populate('creadoPor', 'nombre apellido');
        }


        // --- Regenerar PDF y subir a Google Drive actualizando el archivoPDF ---
        try {
            const pdfBuffer = await generarActaPDF(acta);
            const fechaLimpia = new Date(acta.fecha).toISOString().split('T')[0];
            const safeTitle = acta.titulo.replace(/[^a-zA-Z0-9]/g, '_');
            const pdfFileName = `Acta_Actualizada_${fechaLimpia}_${safeTitle}.pdf`;
            
            const driveLink = await uploadPdfToDrive(pdfBuffer, pdfFileName, 'actas');
            
            acta.archivoPDF = driveLink;
            await acta.save();
        } catch (uploadError) {
            console.error('Error al re-generar o subir PDF actualizado de acta:', uploadError);
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
