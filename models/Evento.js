const BaseModel = require('./BaseModel');

const mappings = {
    creadoPor: 'creado_por',
    imagenUrl: 'imagen_url',
    fraternidadId: 'fraternidad_id',
    esNacional: 'es_nacional'
};

module.exports = new BaseModel('eventos', mappings);
