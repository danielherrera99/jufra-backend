const BaseModel = require('./BaseModel');

const mappings = {
    creadoPor: 'creado_por',
    imagenUrl: 'imagen_url'
};

module.exports = new BaseModel('eventos', mappings);
