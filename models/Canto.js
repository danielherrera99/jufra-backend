const BaseModel = require('./BaseModel');

const mappings = {
    creadoPor: 'creado_por',
    archivoUrl: 'archivo_url',
    archivoNombre: 'archivo_nombre',
    fraternidadId: 'fraternidad_id',
    esNacional: 'es_nacional'
};

module.exports = new BaseModel('cantos', mappings);
