const express = require('express');
const router = express.Router();
const Espiritualidad = require('../models/Espiritualidad');
const { proteger, autorizarRoles } = require('../middleware/auth');
const {
    buildMultiTenantFilter,
    resolveTargetFraternidadId,
    parseEsNacional,
    canModifyItem
} = require('../utils/multiTenantFilter');

// @route   GET /api/espiritualidad
// @desc    Obtener todos los items
// @access  Public
router.get('/', async (req, res) => {
    try {
        const filtro = buildMultiTenantFilter(req, {}, { allowNational: true });
        const items = await Espiritualidad.find(filtro).sort({ createdAt: -1 });
        res.json({ success: true, items });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// @route   POST /api/espiritualidad
// @desc    Crear item
// @access  Private (Admin/Consejo)
router.post('/', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const { titulo, contenido, tipo, categoria } = req.body;
        const newItem = await Espiritualidad.create({
            titulo,
            contenido,
            tipo,
            categoria,
            creadoPor: req.usuario._id,
            fraternidadId: resolveTargetFraternidadId(req),
            esNacional: parseEsNacional(req)
        });
        res.status(201).json({ success: true, item: newItem });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear' });
    }
});

// @route   PUT /api/espiritualidad/:id
// @desc    Actualizar item
// @access  Private (Admin/Consejo)
router.put('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const { titulo, contenido, tipo, categoria } = req.body;
        let item = await Espiritualidad.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'No encontrado' });
        if (!canModifyItem(req, item)) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para editar este registro' });
        }

        item.titulo = titulo || item.titulo;
        item.contenido = contenido || item.contenido;
        item.tipo = tipo || item.tipo;
        if (categoria !== undefined) item.categoria = categoria;
        if (req.body.esNacional !== undefined) item.esNacional = parseEsNacional(req);

        await item.save();
        res.json({ success: true, item });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar' });
    }
});

// @route   DELETE /api/espiritualidad/:id
// @desc    Eliminar item
// @access  Private (Admin/Consejo)
router.delete('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const item = await Espiritualidad.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'No encontrado' });
        if (!canModifyItem(req, item)) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este registro' });
        }

        await item.deleteOne();
        res.json({ success: true, message: 'Eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar' });
    }
});

module.exports = router;
