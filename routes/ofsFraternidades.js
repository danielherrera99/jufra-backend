const express = require('express');
const router = express.Router();
const OfsFraternidad = require('../models/OfsFraternidad');
const { proteger, autorizarRoles } = require('../middleware/auth');

// @route   GET /api/ofs-fraternidades
// @desc    Obtener todas las fraternidades de la OFS (Público)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const fraternidades = await OfsFraternidad.find().sort({ departamento: 1, nombre: 1 });
        res.json({ success: true, count: fraternidades.length, data: fraternidades });
    } catch (error) {
        console.error('Error al obtener fraternidades OFS:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las fraternidades OFS' });
    }
});

// @route   GET /api/ofs-fraternidades/:id
// @desc    Obtener una fraternidad OFS por ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const fraternidad = await OfsFraternidad.findById(req.params.id);
        if (!fraternidad) {
            return res.status(404).json({ success: false, message: 'Fraternidad OFS no encontrada' });
        }
        res.json({ success: true, data: fraternidad });
    } catch (error) {
        console.error('Error al obtener fraternidad OFS:', error);
        res.status(500).json({ success: false, message: 'Error al obtener la fraternidad OFS' });
    }
});

// @route   POST /api/ofs-fraternidades
// @desc    Crear una nueva fraternidad OFS (SuperAdmin / Admin Nacional)
// @access  Private
router.post('/', proteger, autorizarRoles('superadmin', 'admin_nacional'), async (req, res) => {
    try {
        const {
            nombre,
            patrono,
            sede,
            departamento,
            ciudad,
            zona,
            horarios,
            contacto,
            telefono,
            enlaceWeb,
            enlaceSocial,
            imagenUrl,
            activo
        } = req.body;

        if (!nombre) {
            return res.status(400).json({ success: false, message: 'El nombre de la fraternidad es obligatorio' });
        }

        const nuevaFraternidad = await OfsFraternidad.create({
            nombre,
            patrono: patrono || '',
            sede: sede || '',
            departamento: departamento || 'Lambayeque',
            ciudad: ciudad || '',
            zona: zona || 'norte',
            horarios: horarios || '',
            contacto: contacto || '',
            telefono: telefono || '',
            enlaceWeb: enlaceWeb || '',
            enlaceSocial: enlaceSocial || '',
            imagenUrl: imagenUrl || '',
            activo: activo !== undefined ? activo : true
        });

        res.status(201).json({ success: true, data: nuevaFraternidad });
    } catch (error) {
        console.error('Error al crear fraternidad OFS:', error);
        res.status(500).json({ success: false, message: 'Error al crear la fraternidad OFS' });
    }
});

// @route   PUT /api/ofs-fraternidades/:id
// @desc    Actualizar una fraternidad OFS (SuperAdmin / Admin Nacional)
// @access  Private
router.put('/:id', proteger, autorizarRoles('superadmin', 'admin_nacional'), async (req, res) => {
    try {
        const {
            nombre,
            patrono,
            sede,
            departamento,
            ciudad,
            zona,
            horarios,
            contacto,
            telefono,
            enlaceWeb,
            enlaceSocial,
            imagenUrl,
            activo
        } = req.body;

        let fraternidad = await OfsFraternidad.findById(req.params.id);
        if (!fraternidad) {
            return res.status(404).json({ success: false, message: 'Fraternidad OFS no encontrada' });
        }

        if (nombre !== undefined) fraternidad.nombre = nombre;
        if (patrono !== undefined) fraternidad.patrono = patrono;
        if (sede !== undefined) fraternidad.sede = sede;
        if (departamento !== undefined) fraternidad.departamento = departamento;
        if (ciudad !== undefined) fraternidad.ciudad = ciudad;
        if (zona !== undefined) fraternidad.zona = zona;
        if (horarios !== undefined) fraternidad.horarios = horarios;
        if (contacto !== undefined) fraternidad.contacto = contacto;
        if (telefono !== undefined) fraternidad.telefono = telefono;
        if (enlaceWeb !== undefined) fraternidad.enlaceWeb = enlaceWeb;
        if (enlaceSocial !== undefined) fraternidad.enlaceSocial = enlaceSocial;
        if (imagenUrl !== undefined) fraternidad.imagenUrl = imagenUrl;
        if (activo !== undefined) fraternidad.activo = activo;

        await fraternidad.save();
        res.json({ success: true, data: fraternidad });
    } catch (error) {
        console.error('Error al actualizar fraternidad OFS:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar la fraternidad OFS' });
    }
});

// @route   DELETE /api/ofs-fraternidades/:id
// @desc    Eliminar una fraternidad OFS (SuperAdmin / Admin Nacional)
// @access  Private
router.delete('/:id', proteger, autorizarRoles('superadmin', 'admin_nacional'), async (req, res) => {
    try {
        const fraternidad = await OfsFraternidad.findById(req.params.id);
        if (!fraternidad) {
            return res.status(404).json({ success: false, message: 'Fraternidad OFS no encontrada' });
        }

        await fraternidad.deleteOne();
        res.json({ success: true, message: 'Fraternidad OFS eliminada con éxito' });
    } catch (error) {
        console.error('Error al eliminar fraternidad OFS:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la fraternidad OFS' });
    }
});

module.exports = router;
