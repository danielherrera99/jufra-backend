const BaseModel = require('./BaseModel');

const mappings = {
    creadoPor: 'creado_por',
    createdAt: 'created_at',
    fraternidadId: 'fraternidad_id',
    esNacional: 'es_nacional'
};

module.exports = new BaseModel('espiritualidad', mappings);
