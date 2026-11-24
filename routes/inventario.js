const express = require('express');
const router = express.Router();
const Inventario = require('../models/Inventario');
const PrestamoInventario = require('../models/PrestamoInventario');
const Usuario = require('../models/Usuario');
const db = require('../db');
const { proteger, autorizarRoles } = require('../middleware/auth');

// Solo administradores pueden gestionar el inventario
const soloAdmin = [proteger, autorizarRoles('admin')];

// @route   GET /api/inventario
// @desc    Obtener lista de artículos del inventario con sus préstamos activos y estadísticas
// @access  Private (Admin)
router.get('/', soloAdmin, async (req, res) => {
    try {
        const { categoria, estado, busqueda } = req.query;

        // Filtro Multi-Tenant
        let fratId = null;
        const esSuperAdmin = req.usuario.rol === 'superadmin' || req.usuario.rol === 'admin_nacional';
        if (esSuperAdmin) {
            fratId = req.query.fraternidadId || null;
        } else {
            fratId = req.usuario.fraternidadId || req.usuario.fraternidad_id;
        }

        let query = db('inventario');
        if (fratId) {
            query = query.where('fraternidad_id', fratId);
        }
        if (categoria && categoria !== 'todos') {
            query = query.where('categoria', categoria);
        }
        if (estado && estado !== 'todos') {
            query = query.where('estado', estado);
        }
        if (busqueda && busqueda.trim()) {
            const term = `%${busqueda.trim()}%`;
            query = query.where(function() {
                this.where('nombre', 'ilike', term)
                    .orWhere('codigo', 'ilike', term)
                    .orWhere('ubicacion', 'ilike', term);
            });
        }

        const rows = await query.orderBy('created_at', 'desc');

        // Mapear objetos Mongoose
        const articulos = rows.map(r => Inventario.fromPostgres(r));

        // Obtener préstamos activos para los artículos prestados
        const articulosPrestadosIds = articulos.filter(a => a.estado === 'prestado').map(a => a.id);
        let prestamosActivosMap = new Map();

        if (articulosPrestadosIds.length > 0) {
            const prestamosActivos = await db('prestamos_inventario')
                .whereIn('articulo_id', articulosPrestadosIds)
                .where('estado', 'activo')
                .orderBy('fecha_prestamo', 'desc');

            const userIds = [...new Set(prestamosActivos.map(p => p.usuario_id).filter(Boolean))];
            const users = userIds.length > 0 ? await db('usuarios').whereIn('id', userIds) : [];
            const userMap = new Map(users.map(u => [u.id, {
                _id: u.id,
                id: u.id,
                nombre: u.nombre,
                apellido: u.apellido,
                telefono: u.telefono,
                foto: u.foto_url
            }]));

            for (const p of prestamosActivos) {
                if (!prestamosActivosMap.has(p.articulo_id)) {
                    prestamosActivosMap.set(p.articulo_id, {
                        ...p,
                        usuario: p.usuario_id ? userMap.get(p.usuario_id) : null
                    });
                }
            }
        }

        // Adjuntar préstamo activo si existe
        for (const a of articulos) {
            a.prestamoActivo = prestamosActivosMap.get(a.id) || null;
        }

        // Métricas rápidas
        let queryCount = db('inventario');
        if (fratId) queryCount = queryCount.where('fraternidad_id', fratId);
        const todosArticulos = await queryCount.select('id', 'estado');

        let queryAtrasados = db('prestamos_inventario')
            .where('estado', 'activo')
            .where('fecha_devolucion_esperada', '<', new Date().toISOString().split('T')[0]);
        if (fratId) queryAtrasados = queryAtrasados.where('fraternidad_id', fratId);
        const countAtrasadosRes = await queryAtrasados.count('id as count').first();

        const stats = {
            total: todosArticulos.length,
            disponibles: todosArticulos.filter(a => a.estado === 'disponible').length,
            prestados: todosArticulos.filter(a => a.estado === 'prestado').length,
            mantenimiento: todosArticulos.filter(a => a.estado === 'mantenimiento').length,
            atrasados: parseInt(countAtrasadosRes?.count || 0)
        };

        res.status(200).json({
            success: true,
            count: articulos.length,
            stats,
            articulos
        });
    } catch (error) {
        console.error('Error al obtener inventario:', error);
        res.status(500).json({ success: false, message: 'Error al obtener inventario', error: error.message });
    }
});

// @route   POST /api/inventario
// @desc    Crear un nuevo artículo en el inventario
// @access  Private (Admin)
router.post('/', soloAdmin, async (req, res) => {
    try {
        const { nombre, categoria, codigo, descripcion, ubicacion, foto } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ success: false, message: 'El nombre del artículo es obligatorio.' });
        }

        const fratId = req.usuario.rol === 'superadmin' && req.body.fraternidadId
            ? req.body.fraternidadId
            : (req.usuario.fraternidadId || req.usuario.fraternidad_id);

        const nuevoArticulo = await Inventario.create({
            nombre: nombre.trim(),
            categoria: categoria || 'otros',
            codigo: codigo ? codigo.trim() : null,
            descripcion: descripcion || '',
            ubicacion: ubicacion || '',
            foto: foto || null,
            estado: 'disponible',
            fraternidadId: fratId,
            creadoPor: req.usuario._id
        });

        res.status(201).json({
            success: true,
            message: 'Artículo registrado exitosamente en el inventario',
            articulo: nuevoArticulo
        });
    } catch (error) {
        console.error('Error al crear artículo:', error);
        res.status(500).json({ success: false, message: 'Error al registrar artículo', error: error.message });
    }
});

// @route   PUT /api/inventario/:id
// @desc    Actualizar un artículo del inventario
// @access  Private (Admin)
router.put('/:id', soloAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, categoria, codigo, descripcion, ubicacion, estado, foto } = req.body;

        const articulo = await Inventario.findById(id);
        if (!articulo) {
            return res.status(404).json({ success: false, message: 'Artículo no encontrado.' });
        }

        const actualizado = await Inventario.findByIdAndUpdate(id, {
            nombre: nombre ? nombre.trim() : articulo.nombre,
            categoria: categoria || articulo.categoria,
            codigo: codigo !== undefined ? (codigo ? codigo.trim() : null) : articulo.codigo,
            descripcion: descripcion !== undefined ? descripcion : articulo.descripcion,
            ubicacion: ubicacion !== undefined ? ubicacion : articulo.ubicacion,
            estado: estado || articulo.estado,
            foto: foto !== undefined ? foto : articulo.foto,
            updatedAt: new Date()
        });

        res.status(200).json({
            success: true,
            message: 'Artículo actualizado correctamente',
            articulo: actualizado
        });
    } catch (error) {
        console.error('Error al actualizar artículo:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar artículo', error: error.message });
    }
});

// @route   DELETE /api/inventario/:id
// @desc    Eliminar un artículo del inventario
// @access  Private (Admin)
router.delete('/:id', soloAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const articulo = await Inventario.findById(id);
        if (!articulo) {
            return res.status(404).json({ success: false, message: 'Artículo no encontrado.' });
        }

        await Inventario.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Artículo eliminado correctamente del inventario'
        });
    } catch (error) {
        console.error('Error al eliminar artículo:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar artículo', error: error.message });
    }
});

// @route   POST /api/inventario/:id/prestar
// @desc    Registrar préstamo de un artículo a un hermano o persona
// @access  Private (Admin)
router.post('/:id/prestar', soloAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { usuarioId, nombrePersona, telefonoContacto, fechaDevolucionEsperada, observacionesPrestamo } = req.body;

        const articulo = await Inventario.findById(id);
        if (!articulo) {
            return res.status(404).json({ success: false, message: 'Artículo no encontrado.' });
        }

        if (articulo.estado === 'prestado') {
            return res.status(400).json({ success: false, message: 'El artículo ya se encuentra prestado actualmente.' });
        }

        let nombrePrestamo = nombrePersona;
        let telefono = telefonoContacto;

        if (usuarioId) {
            const u = await Usuario.findById(usuarioId);
            if (u) {
                nombrePrestamo = `${u.nombre} ${u.apellido}`;
                telefono = telefono || u.telefono || u.contactoEmergencia;
            }
        }

        if (!nombrePrestamo && !usuarioId) {
            return res.status(400).json({ success: false, message: 'Debes indicar el hermano o persona que recibe el préstamo.' });
        }

        const fratId = articulo.fraternidadId || articulo.fraternidad_id;

        // 1. Crear registro de préstamo
        const nuevoPrestamo = await PrestamoInventario.create({
            articuloId: id,
            fraternidadId: fratId,
            usuarioId: usuarioId || null,
            nombrePersona: nombrePrestamo || 'Hermano',
            telefonoContacto: telefono || '',
            fechaPrestamo: new Date(),
            fechaDevolucionEsperada: fechaDevolucionEsperada || null,
            estado: 'activo',
            observacionesPrestamo: observacionesPrestamo || '',
            registradoPor: req.usuario._id
        });

        // 2. Actualizar estado del artículo a "prestado"
        await Inventario.findByIdAndUpdate(id, {
            estado: 'prestado',
            updatedAt: new Date()
        });

        res.status(201).json({
            success: true,
            message: `Préstamo registrado a nombre de ${nombrePrestamo}`,
            prestamo: nuevoPrestamo
        });
    } catch (error) {
        console.error('Error al registrar préstamo:', error);
        res.status(500).json({ success: false, message: 'Error al registrar préstamo', error: error.message });
    }
});

// @route   POST /api/inventario/:id/devolver
// @desc    Registrar devolución de un artículo prestado
// @access  Private (Admin)
router.post('/:id/devolver', soloAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { observacionesDevolucion } = req.body;

        const articulo = await Inventario.findById(id);
        if (!articulo) {
            return res.status(404).json({ success: false, message: 'Artículo no encontrado.' });
        }

        // 1. Buscar el préstamo activo
        const prestamoActivo = await db('prestamos_inventario')
            .where('articulo_id', id)
            .where('estado', 'activo')
            .orderBy('fecha_prestamo', 'desc')
            .first();

        if (prestamoActivo) {
            await db('prestamos_inventario')
                .where('id', prestamoActivo.id)
                .update({
                    estado: 'devuelto',
                    fecha_devolucion_real: new Date(),
                    observaciones_devolucion: observacionesDevolucion || '',
                    updated_at: new Date()
                });
        }

        // 2. Regresar artículo a estado disponible
        const articuloActualizado = await Inventario.findByIdAndUpdate(id, {
            estado: 'disponible',
            updatedAt: new Date()
        });

        res.status(200).json({
            success: true,
            message: 'Devolución registrada exitosamente. Artículo ahora disponible.',
            articulo: articuloActualizado
        });
    } catch (error) {
        console.error('Error al registrar devolución:', error);
        res.status(500).json({ success: false, message: 'Error al registrar devolución', error: error.message });
    }
});

// @route   GET /api/inventario/prestamos/historial
// @desc    Historial de todos los préstamos
// @access  Private (Admin)
router.get('/prestamos/historial', soloAdmin, async (req, res) => {
    try {
        let fratId = null;
        const esSuperAdmin = req.usuario.rol === 'superadmin' || req.usuario.rol === 'admin_nacional';
        if (esSuperAdmin) {
            fratId = req.query.fraternidadId || null;
        } else {
            fratId = req.usuario.fraternidadId || req.usuario.fraternidad_id;
        }

        let query = db('prestamos_inventario as p')
            .join('inventario as i', 'p.articulo_id', 'i.id')
            .leftJoin('usuarios as u', 'p.usuario_id', 'u.id')
            .leftJoin('usuarios as reg', 'p.registrado_por', 'reg.id')
            .select(
                'p.*',
                'i.nombre as articulo_nombre',
                'i.categoria as articulo_categoria',
                'i.codigo as articulo_codigo',
                'i.foto_url as articulo_foto',
                'u.nombre as usuario_nombre',
                'u.apellido as usuario_apellido',
                'u.foto_url as usuario_foto',
                'reg.nombre as registrador_nombre',
                'reg.apellido as registrador_apellido'
            );

        if (fratId) {
            query = query.where('p.fraternidad_id', fratId);
        }

        const rows = await query.orderBy('p.fecha_prestamo', 'desc').limit(100);

        res.status(200).json({
            success: true,
            count: rows.length,
            prestamos: rows
        });
    } catch (error) {
        console.error('Error al obtener historial de préstamos:', error);
        res.status(500).json({ success: false, message: 'Error al obtener historial', error: error.message });
    }
});

module.exports = router;
