const BaseModel = require('./BaseModel');

const mappings = {
    cupoMaximo: 'cupo_maximo',
    imagen: 'imagen_url',
    creadoPor: 'creado_por',
    fraternidadId: 'fraternidad_id',
    esNacional: 'es_nacional'
};

module.exports = new BaseModel('servicios', mappings);
