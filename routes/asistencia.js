const express = require('express');
const router = express.Router();
const Asistencia = require('../models/Asistencia');
const Usuario = require('../models/Usuario');
const { proteger, autorizarRoles } = require('../middleware/auth');

// @route   POST /api/asistencia
// @desc    Registrar asistencia
// @access  Private (Admin/Consejo)
router.post('/', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const { usuario, fecha, tipoReunion, estado, metodoRegistro, observaciones } = req.body;

        // Verificar que el usuario existe
        const hermano = await Usuario.findById(usuario);
        if (!hermano) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Crear registro de asistencia
        const asistencia = await Asistencia.create({
            usuario,
            fecha: fecha || new Date(),
            tipoReunion,
            estado: estado || 'presente',
            presente: estado === 'presente',
            metodoRegistro,
            observaciones,
            registradoPor: req.usuario._id
        });

        await asistencia.populate('usuario', 'nombre apellido foto');

        res.status(201).json({
            success: true,
            message: 'Asistencia registrada exitosamente',
            asistencia
        });
    } catch (error) {
        console.error(error);

        // Manejar error de duplicado
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un registro de asistencia para este usuario en esta fecha y tipo de reunión'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al registrar asistencia',
            error: error.message
        });
    }
});

// @route   POST /api/asistencia/lote
// @desc    Registrar asistencia masiva (por lote)
// @access  Private (Admin/Consejo)
router.post('/lote', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const { asistencias, fecha, tipoReunion } = req.body;
        
        const bulkOps = asistencias.map(asis => {
            const fechaNormalizada = new Date(fecha);
            fechaNormalizada.setHours(12, 0, 0, 0); // Normalizar a mediodía para evitar desfases de zona horaria en la búsqueda

            return {
                updateOne: {
                    filter: { 
                        usuario: asis.usuarioId, 
                        fecha: { 
                            $gte: new Date(fechaNormalizada).setHours(0,0,0,0), 
                            $lte: new Date(fechaNormalizada).setHours(23,59,59,999) 
                        }, 
                        tipoReunion 
                    },
                    update: {
                        $set: {
                            usuario: asis.usuarioId,
                            fecha: fechaNormalizada,
                            tipoReunion,
                            estado: asis.estado || 'presente',
                            presente: asis.estado === 'presente',
                            metodoRegistro: 'manual_web',
                            observaciones: asis.observaciones || '',
                            registradoPor: req.usuario._id
                        }
                    },
                    upsert: true
                }
            };
        });

        await Asistencia.bulkWrite(bulkOps);

        res.status(201).json({
            success: true,
            message: 'Asistencia masiva procesada exitosamente'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar asistencia masiva',
            error: error.message
        });
    }
});

// @route   POST /api/asistencia/qr
// @desc    Registrar asistencia mediante código QR
// @access  Private
router.post('/qr', proteger, async (req, res) => {
    try {
        const { qrData, tipoReunion } = req.body;

        // Parsear datos del QR
        const datosQR = JSON.parse(qrData);
        const usuarioId = datosQR.id;

        // Verificar que el usuario existe
        const hermano = await Usuario.findById(usuarioId);
        if (!hermano) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Crear registro de asistencia
        const asistencia = await Asistencia.create({
            usuario: usuarioId,
            fecha: new Date(),
            tipoReunion: tipoReunion || 'semanal',
            presente: true,
            metodoRegistro: 'qr',
            registradoPor: req.usuario._id
        });

        await asistencia.populate('usuario', 'nombre apellido foto');

        res.status(201).json({
            success: true,
            message: `Asistencia registrada para ${hermano.nombreCompleto}`,
            asistencia
        });
    } catch (error) {
        console.error(error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'La asistencia ya fue registrada'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al registrar asistencia por QR',
            error: error.message
        });
    }
});

// @route   GET /api/asistencia
// @desc    Obtener registros de asistencia
// @access  Private
router.get('/', proteger, async (req, res) => {
    try {
        const { fecha, tipoReunion, usuario } = req.query;

        // Construir filtro
        const filtro = {};
        if (fecha) filtro.fecha = { $gte: new Date(fecha) };
        if (tipoReunion) filtro.tipoReunion = tipoReunion;
        if (usuario) filtro.usuario = usuario;

        const asistencias = await Asistencia.find(filtro)
            .populate('usuario', 'nombre apellido foto')
            .populate('registradoPor', 'nombre apellido')
            .sort({ fecha: -1 });

        res.status(200).json({
            success: true,
            count: asistencias.length,
            asistencias
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asistencias',
            error: error.message
        });
    }
});

// @route   GET /api/asistencia/estadisticas/:usuarioId
// @desc    Obtener estadísticas de asistencia de un usuario
// @access  Private
router.get('/estadisticas/:usuarioId', proteger, async (req, res) => {
    try {
        const { usuarioId } = req.params;

        const totalAsistencias = await Asistencia.countDocuments({
            usuario: usuarioId,
            presente: true
        });

        const totalFaltas = await Asistencia.countDocuments({
            usuario: usuarioId,
            presente: false
        });

        const porTipo = await Asistencia.aggregate([
            { $match: { usuario: usuarioId } },
            {
                $group: {
                    _id: '$tipoReunion',
                    total: { $sum: 1 },
                    presentes: {
                        $sum: { $cond: ['$presente', 1, 0] }
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            estadisticas: {
                totalAsistencias,
                totalFaltas,
                porcentajeAsistencia: totalAsistencias + totalFaltas > 0
                    ? ((totalAsistencias / (totalAsistencias + totalFaltas)) * 100).toFixed(2)
                    : 0,
                porTipo
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
});

// @route   GET /api/asistencia/exportar
// @desc    Exportar reporte de asistencias a Excel
// @access  Private (Admin/Consejo)
router.get('/exportar', proteger, autorizarRoles('admin', 'consejo'), async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        let filtro = {};

        if (fechaInicio && fechaFin) {
            const start = new Date(fechaInicio);
            start.setHours(0, 0, 0, 0); // Inicio del día
            
            const end = new Date(fechaFin);
            end.setHours(23, 59, 59, 999); // Final del día logístico
            
            filtro.fecha = { $gte: start, $lte: end };
        }

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Asistencias');

        worksheet.columns = [
            { header: 'Fecha', key: 'fecha', width: 15 },
            { header: 'Hermano', key: 'hermano', width: 30 },
            { header: 'Tipo Reunión', key: 'tipo', width: 15 },
            { header: 'Estado', key: 'estado', width: 10 },
            { header: 'Método', key: 'metodo', width: 15 },
            { header: 'Observaciones', key: 'observaciones', width: 30 },
        ];

        const asistencias = await Asistencia.find(filtro)
            .populate('usuario', 'nombre apellido')
            .sort({ fecha: -1 });

        asistencias.forEach(a => {
            worksheet.addRow({
                fecha: a.fecha ? new Date(a.fecha).toLocaleDateString('es-ES', { timeZone: 'America/Lima' }) : '',
                hermano: a.usuario ? `${a.usuario.nombre} ${a.usuario.apellido}` : 'Usuario Eliminado',
                tipo: a.tipoReunion,
                estado: a.estado ? (a.estado.charAt(0).toUpperCase() + a.estado.slice(1)) : (a.presente ? 'Presente' : 'Falta'),
                metodo: a.metodoRegistro,
                observaciones: a.observaciones || ''
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=asistencias.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al exportar excel',
            error: error.message
        });
    }
});

module.exports = router;
