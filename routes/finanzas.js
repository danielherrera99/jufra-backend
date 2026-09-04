const express = require('express');
const router = express.Router();
const Finanza = require('../models/Finanza');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// Obtener todas las finanzas y el balance
router.get('/', auth, checkRole(['admin', 'consejo']), async (req, res) => {
    try {
        const transacciones = await Finanza.find().sort({ fecha: -1, created_at: -1 }).populate('registradoPor');

        let ingresosTotales = 0;
        let egresosTotales = 0;

        transacciones.forEach(t => {
            if (t.tipo === 'ingreso') {
                ingresosTotales += parseFloat(t.monto);
            } else if (t.tipo === 'egreso') {
                egresosTotales += parseFloat(t.monto);
            }
        });

        const saldo = ingresosTotales - egresosTotales;

        res.json({
            success: true,
            data: transacciones,
            resumen: {
                ingresosTotales,
                egresosTotales,
                saldo
            }
        });
    } catch (error) {
        console.error('Error al obtener finanzas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener registros de finanzas' });
    }
});

// Obtener una transacción específica
router.get('/:id', auth, checkRole(['admin', 'consejo']), async (req, res) => {
    try {
        const transaccion = await Finanza.findById(req.params.id).populate('registradoPor');
        if (!transaccion) {
            return res.status(404).json({ success: false, message: 'Registro no encontrado' });
        }
        res.json({ success: true, data: transaccion });
    } catch (error) {
        console.error('Error al obtener finanza por ID:', error);
        res.status(500).json({ success: false, message: 'Error al obtener registro' });
    }
});

// Crear un nuevo registro financiero
router.post('/', auth, checkRole(['admin', 'consejo']), async (req, res) => {
    try {
        const { tipo, monto, fecha, descripcion, categoria, comprobante_url } = req.body;
        
        if (!tipo || !monto || !descripcion) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }

        const nuevaFinanza = await Finanza.create({
            tipo,
            monto,
            fecha: fecha || new Date(),
            descripcion,
            categoria: categoria || 'otros',
            comprobante_url: comprobante_url || null,
            registrado_por: req.usuario.id
        });

        const transaccionCompletada = await Finanza.findById(nuevaFinanza.id).populate('registradoPor');

        res.status(201).json({ success: true, data: transaccionCompletada });
    } catch (error) {
        console.error('Error al crear finanza:', error);
        res.status(500).json({ success: false, message: 'Error al registrar finanza' });
    }
});

// Actualizar un registro financiero
router.put('/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { tipo, monto, fecha, descripcion, categoria, comprobante_url } = req.body;
        
        let transaccion = await Finanza.findById(req.params.id);
        if (!transaccion) {
            return res.status(404).json({ success: false, message: 'Registro no encontrado' });
        }

        const datosActualizados = {
            tipo: tipo || transaccion.tipo,
            monto: monto !== undefined ? monto : transaccion.monto,
            fecha: fecha || transaccion.fecha,
            descripcion: descripcion || transaccion.descripcion,
            categoria: categoria || transaccion.categoria,
            comprobante_url: comprobante_url !== undefined ? comprobante_url : transaccion.comprobante_url,
            updatedAt: new Date()
        };

        const transaccionActualizada = await Finanza.findByIdAndUpdate(req.params.id, datosActualizados);
        const transaccionCompletada = await Finanza.findById(transaccionActualizada.id).populate('registradoPor');

        res.json({ success: true, data: transaccionCompletada });
    } catch (error) {
        console.error('Error al actualizar finanza:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar registro' });
    }
});

// Eliminar un registro financiero
router.delete('/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const transaccion = await Finanza.findById(req.params.id);
        if (!transaccion) {
            return res.status(404).json({ success: false, message: 'Registro no encontrado' });
        }

        await Finanza.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Registro financiero eliminado' });
    } catch (error) {
        console.error('Error al eliminar finanza:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar registro' });
    }
});

module.exports = router;
