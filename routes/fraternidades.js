const express = require('express');
const router = express.Router();
const Fraternidad = require('../models/Fraternidad');
const { proteger, autorizarRoles } = require('../middleware/auth');

// @route   GET /api/fraternidades
// @desc    Obtener todas las fraternidades (Público)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const fraternidades = await Fraternidad.find().sort({ departamento: 1, nombre: 1 });
        res.json({ success: true, count: fraternidades.length, data: fraternidades });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener las fraternidades' });
    }
});

// @route   POST /api/fraternidades
// @desc    Crear una nueva fraternidad (Admin/Consejo)
// @access  Private
router.post('/', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const { nombre, departamento, parroquia, zona, contacto, telefono, enlaceSocial } = req.body;
        
        if (!nombre || !departamento || !zona) {
            return res.status(400).json({ success: false, message: 'Nombre, departamento y zona son obligatorios' });
        }

        const nuevaFraternidad = await Fraternidad.create({
            nombre,
            departamento,
            parroquia,
            zona,
            contacto,
            telefono,
            enlaceSocial
        });

        res.status(201).json({ success: true, data: nuevaFraternidad });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear la fraternidad' });
    }
});

// @route   PUT /api/fraternidades/:id
// @desc    Actualizar una fraternidad (Admin/Consejo o Coordinador de esa Fraternidad)
// @access  Private
router.put('/:id', proteger, async (req, res) => {
    try {
        const userRole = (req.user?.rol || '').toLowerCase();
        const userFraternidad = req.user?.fraternidad_id || req.user?.fraternidadId;
        const isGlobalAdmin = ['admin', 'superadmin', 'consejo', 'admin_nacional'].includes(userRole);
        const isLocalCoord = userFraternidad && String(userFraternidad) === String(req.params.id);

        if (!isGlobalAdmin && !isLocalCoord) {
            return res.status(403).json({ success: false, message: 'No tienes permisos para modificar los datos de esta fraternidad.' });
        }

        const { nombre, departamento, parroquia, zona, contacto, telefono, enlaceSocial } = req.body;
        
        let fraternidad = await Fraternidad.findById(req.params.id);
        if (!fraternidad) {
            return res.status(404).json({ success: false, message: 'Fraternidad no encontrada' });
        }

        // Solo admin nacional / global puede cambiar nombre, departamento o zona
        if (nombre && isGlobalAdmin) fraternidad.nombre = nombre;
        if (departamento && isGlobalAdmin) fraternidad.departamento = departamento;
        if (zona && isGlobalAdmin) fraternidad.zona = zona;

        // Coordinador local o admin pueden actualizar sede, contacto, teléfono y redes
        fraternidad.parroquia = parroquia !== undefined ? parroquia : fraternidad.parroquia;
        fraternidad.contacto = contacto !== undefined ? contacto : fraternidad.contacto;
        fraternidad.telefono = telefono !== undefined ? telefono : fraternidad.telefono;
        fraternidad.enlaceSocial = enlaceSocial !== undefined ? enlaceSocial : fraternidad.enlaceSocial;

        await fraternidad.save();
        res.json({ success: true, data: fraternidad, message: '¡Datos de la fraternidad actualizados con éxito!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar la fraternidad' });
    }
});

// @route   DELETE /api/fraternidades/:id
// @desc    Eliminar una fraternidad (Admin/Consejo)
// @access  Private
router.delete('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const fraternidad = await Fraternidad.findById(req.params.id);
        if (!fraternidad) {
            return res.status(404).json({ success: false, message: 'Fraternidad no encontrada' });
        }

        await fraternidad.deleteOne();
        res.json({ success: true, message: 'Fraternidad eliminada con éxito' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar la fraternidad' });
    }
});

module.exports = router;
