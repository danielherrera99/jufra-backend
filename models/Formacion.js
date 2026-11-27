const BaseModel = require('./BaseModel');

const mappings = {
    autor: 'autor',
    archivoUrl: 'archivo_url',
    archivoNombre: 'archivo_nombre',
    fraternidadId: 'fraternidad_id',
    esNacional: 'es_nacional'
};

module.exports = new BaseModel('formaciones', mappings);
