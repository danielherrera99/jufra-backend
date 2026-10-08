const express = require('express');
const router = express.Router();
const registroMascotaController = require('../controllers/registroMascotaController');
const { proteger, autorizarRoles } = require('../middleware/auth');

// Rutas públicas
router.post('/registro', registroMascotaController.crearRegistro);
router.get('/estado/:idSolicitud', registroMascotaController.consultarEstado);
router.get('/descargar-certificado/:idSolicitud', registroMascotaController.generarCertificadoPDF);

// Rutas privadas (Admin Dashboard)
router.get('/', proteger, autorizarRoles('admin', 'editor'), registroMascotaController.obtenerRegistros);
router.put('/:id/servicios', proteger, autorizarRoles('admin', 'editor'), registroMascotaController.actualizarServicios);
router.put('/:id/aprobar', proteger, autorizarRoles('admin', 'editor'), registroMascotaController.aprobarRegistro);

module.exports = router;
