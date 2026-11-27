const BaseModel = require('./BaseModel');

const mappings = {
    archivoUrl: 'archivo_url',
    archivoNombre: 'archivo_nombre',
    creadoPor: 'creado_por',
    fraternidadId: 'fraternidad_id',
    esNacional: 'es_nacional'
};

module.exports = new BaseModel('documentos', mappings);
