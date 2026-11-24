const BaseModel = require('./BaseModel');

const mappings = {
    fraternidadId: 'fraternidad_id',
    articuloId: 'articulo_id',
    usuarioId: 'usuario_id',
    nombrePersona: 'nombre_persona',
    telefonoContacto: 'telefono_contacto',
    fechaPrestamo: 'fecha_prestamo',
    fechaDevolucionEsperada: 'fecha_devolucion_esperada',
    fechaDevolucionReal: 'fecha_devolucion_real',
    observacionesPrestamo: 'observaciones_prestamo',
    observacionesDevolucion: 'observaciones_devolucion',
    registradoPor: 'registrado_por'
};

module.exports = new BaseModel('prestamos_inventario', mappings);
