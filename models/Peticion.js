const BaseModel = require('./BaseModel');

const mappings = {
    autor: 'autor_id',
    fraternidadId: 'fraternidad_id',
    esNacional: 'es_nacional'
};

module.exports = new BaseModel('peticiones', mappings);
