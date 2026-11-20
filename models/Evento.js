const BaseModel = require('./BaseModel');

const mappings = {
    creadoPor: 'creado_por',
    imagenUrl: 'imagen_url',
    fraternidadId: 'fraternidad_id'
};

module.exports = new BaseModel('eventos', mappings);
