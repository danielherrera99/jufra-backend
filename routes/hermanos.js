const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const { proteger, autorizarRoles } = require('../middleware/auth');

// @route   GET /api/hermanos
// @desc    Obtener todos los hermanos
// @access  Private
router.get('/', proteger, async (req, res) => {
    try {
        let query = { activo: true };

        // Si es admin o consejo, permitir ver inactivos/pendientes
        const esAdmin = req.usuario.rol === 'admin' ||
            req.usuario.rol === 'consejo' ||
            ['coordinador', 'vice-coordinador', 'secretario', 'tesorero', 'formador', 'animador'].includes(req.usuario.cargo);

        if (esAdmin) {
            if (req.query.todos === 'true') {
                query = {};
            } else if (req.query.pendientes === 'true') {
                query = { activo: false };
            }
        }

        const hermanos = await Usuario.find(query)
            .select('-password')
            .sort({ nombre: 1 });

        res.status(200).json({
            success: true,
            count: hermanos.length,
            hermanos
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener hermanos',
            error: error.message
        });
    }
});

// @route   GET /api/hermanos/:id
// @desc    Obtener un hermano por ID
// @access  Private
router.get('/:id', proteger, async (req, res) => {
    try {
        const hermano = await Usuario.findById(req.params.id).select('-password');

        if (!hermano) {
            return res.status(404).json({
                success: false,
                message: 'Hermano no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            hermano
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener hermano',
            error: error.message
        });
    }
});

// @route   PUT /api/hermanos/:id
// @desc    Actualizar información de un hermano
// @access  Private (Admin/Consejo)
router.put('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const camposPermitidos = [
            'nombre', 'apellido', 'telefono', 'fechaNacimiento',
            'fechaIngreso', 'fechaPromesa', 'rol', 'cargo',
            'etapaFormacion', 'foto', 'activo', 'username', 'password', 'email'
        ];

        let hermano = await Usuario.findById(req.params.id);

        if (!hermano) {
            return res.status(404).json({
                success: false,
                message: 'Hermano no encontrado'
            });
        }

        camposPermitidos.forEach(campo => {
            const valor = req.body[campo];
            if (valor !== undefined) {
                // Si es password, solo actualizar si tiene contenido y longitud válida
                if (campo === 'password') {
                    if (valor && valor.trim().length >= 6) {
                        hermano[campo] = valor;
                    }
                    return;
                }

                // Campos obligatorios: no permitir vacíos
                if (['nombre', 'apellido', 'username'].includes(campo) && (!valor || valor.trim() === '')) {
                    return;
                }

                // Campos opcionales: permitir vacíos (convertir a null si es fecha o string vacío)
                if (['fechaNacimiento', 'fechaIngreso', 'fechaPromesa', 'email'].includes(campo)) {
                    if (valor === '' || valor === null) {
                        if (campo === 'email') {
                            hermano[campo] = undefined;
                        } else {
                            hermano[campo] = null;
                        }
                    } else {
                        hermano[campo] = valor;
                    }
                } else {
                    // Otros campos (telefono, rol, cargo, email, etc.)
                    hermano[campo] = valor;
                }
            }
        });

        await hermano.save();

        // Devolver hermano sin password
        hermano = await Usuario.findById(req.params.id).select('-password');

        res.status(200).json({
            success: true,
            message: 'Hermano actualizado exitosamente',
            hermano
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar hermano',
            error: error.message
        });
    }
});

// @route   GET /api/hermanos/aniversarios/proximos
// @desc    Obtener próximos aniversarios (ingreso y promesa)
// @access  Private
router.get('/aniversarios/proximos', proteger, async (req, res) => {
    try {
        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const diaActual = hoy.getDate();

        const hermanos = await Usuario.find({ activo: true }).select('-password');

        const aniversarios = hermanos.map(hermano => {
            const aniversariosHermano = [];

            // Aniversario de ingreso
            if (hermano.fechaIngreso) {
                const fechaIngreso = new Date(hermano.fechaIngreso);
                const mesIngreso = fechaIngreso.getMonth();
                const diaIngreso = fechaIngreso.getDate();

                aniversariosHermano.push({
                    hermano: {
                        id: hermano._id,
                        nombre: hermano.nombreCompleto,
                        foto: hermano.foto
                    },
                    tipo: 'ingreso',
                    fecha: new Date(hoy.getFullYear(), mesIngreso, diaIngreso),
                    años: hoy.getFullYear() - fechaIngreso.getFullYear()
                });
            }

            // Aniversario de promesa
            if (hermano.fechaPromesa) {
                const fechaPromesa = new Date(hermano.fechaPromesa);
                const mesPromesa = fechaPromesa.getMonth();
                const diaPromesa = fechaPromesa.getDate();

                aniversariosHermano.push({
                    hermano: {
                        id: hermano._id,
                        nombre: hermano.nombreCompleto,
                        foto: hermano.foto
                    },
                    tipo: 'promesa',
                    fecha: new Date(hoy.getFullYear(), mesPromesa, diaPromesa),
                    años: hoy.getFullYear() - fechaPromesa.getFullYear()
                });
            }

            return aniversariosHermano;
        }).flat();

        // Filtrar próximos 30 días
        const proximos = aniversarios.filter(aniv => {
            const diff = aniv.fecha - hoy;
            return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
        }).sort((a, b) => a.fecha - b.fecha);

        res.status(200).json({
            success: true,
            count: proximos.length,
            aniversarios: proximos
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener aniversarios',
            error: error.message
        });
    }
});

// @route   DELETE /api/hermanos/:id
// @desc    Eliminar hermano (Si está pendiente: hard delete. Si está activo: soft delete)
// @access  Private (Admin/Consejo)
router.delete('/:id', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const hermano = await Usuario.findById(req.params.id);

        if (!hermano) {
            return res.status(404).json({
                success: false,
                message: 'Hermano no encontrado'
            });
        }

        // Si el usuario ya está inactivo (pendiente), eliminarlo físicamente
        if (!hermano.activo) {
            await Usuario.findByIdAndDelete(req.params.id);
            return res.status(200).json({
                success: true,
                message: 'Solicitud rechazada y eliminada permanentemente'
            });
        }

        // Si el usuario está activo, desactivarlo (soft delete)
        hermano.activo = false;
        await hermano.save();

        res.status(200).json({
            success: true,
            message: 'Hermano desactivado exitosamente'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar hermano',
            error: error.message
        });
    }
});

module.exports = router;
