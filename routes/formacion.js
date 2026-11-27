const express = require('express');
const router = express.Router();
const Formacion = require('../models/Formacion');
const { proteger, autorizarRoles } = require('../middleware/auth');
const {
    buildMultiTenantFilter,
    resolveTargetFraternidadId,
    parseEsNacional,
    canModifyItem
} = require('../utils/multiTenantFilter');

const multer = require('multer');
const path = require('path');
const { uploadFileToDrive } = require('../utils/drive');

// Configurar almacenamiento en memoria
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Aceptar documentos y audios
    if (file.mimetype.startsWith('application/') || file.mimetype.startsWith('text/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Formato de archivo no soportado'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: fileFilter
});

// @route   GET /api/formacion
// @desc    Obtener todos los temas de formación
// @access  Private
router.get('/', proteger, async (req, res) => {
    try {
        const filtro = buildMultiTenantFilter(req, {}, { allowNational: true });
        const temas = await Formacion.find(filtro)
            .populate('autor', 'nombre apellido')
            .sort({ fecha: -1 });

        res.status(200).json({
            success: true,
            count: temas.length,
            temas
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener temas de formación'
        });
    }
});

// @route   POST /api/formacion
// @desc    Crear nuevo tema de formación
// @access  Private (Admin/Consejo/Formador)
router.post('/', proteger, autorizarRoles('admin', 'consejo'), upload.single('archivo'), async (req, res) => {
    try {
        const { titulo, descripcion, contenido, etiquetas } = req.body;

        let archivoUrl = null;
        let archivoNombre = null;

        if (req.file) {
            const driveFile = await uploadFileToDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'formacion');
            archivoUrl = driveFile.webViewLink;
            archivoNombre = req.file.originalname;
        }

        const tema = await Formacion.create({
            titulo,
            descripcion,
            contenido,
            etiquetas,
            autor: req.usuario._id,
            archivoUrl,
            archivoNombre,
            fraternidadId: resolveTargetFraternidadId(req),
            esNacional: parseEsNacional(req)
        });

        res.status(201).json({
            success: true,
            message: 'Tema de formación creado',
            tema
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al crear tema'
        });
    }
});

// @route   GET /api/formacion/:id
// @desc    Obtener un tema por ID
// @access  Private
router.get('/:id', proteger, async (req, res) => {
    try {
        const tema = await Formacion.findById(req.params.id).populate('autor', 'nombre apellido');
        if (!tema) {
            return res.status(404).json({ success: false, message: 'Tema no encontrado' });
        }
        res.status(200).json({ success: true, tema });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener tema' });
    }
});

// @route   PUT /api/formacion/:id
// @desc    Actualizar tema de formación
// @access  Private (Admin/Consejo/Formador)
router.put('/:id', proteger, autorizarRoles('admin', 'consejo'), upload.single('archivo'), async (req, res) => {
    try {
        const existente = await Formacion.findById(req.params.id);
        if (!existente) {
            return res.status(404).json({ success: false, message: 'Tema no encontrado' });
        }
        if (!canModifyItem(req, existente)) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para editar este tema' });
        }

        const datosActualizar = { ...req.body };
        if (req.body.esNacional !== undefined) {
            datosActualizar.esNacional = parseEsNacional(req);
        }

        if (req.file) {
            const driveFile = await uploadFileToDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'formacion');
            datosActualizar.archivoUrl = driveFile.webViewLink;
            datosActualizar.archivoNombre = req.file.originalname;
        }

        const tema = await Formacion.findByIdAndUpdate(req.params.id, datosActualizar, {
            new: true,
            runValidators: true
        });

        if (!tema) {
            return res.status(404).json({ success: false, message: 'Tema no encontrado' });
        }

        res.status(200).json({
            success: true,
            message: 'Tema actualizado exitosamente',
            tema
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar tema'
        });
    }
});

// @route   DELETE /api/formacion/:id
// @desc    Eliminar tema de formación
// @access  Private (Admin/Consejo/Formador)
router.delete('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const existente = await Formacion.findById(req.params.id);
        if (!existente) {
            return res.status(404).json({ success: false, message: 'Tema no encontrado' });
        }
        if (!canModifyItem(req, existente)) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este tema' });
        }

        await Formacion.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Tema eliminado exitosamente'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar tema'
        });
    }
});

module.exports = router;
