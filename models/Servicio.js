const BaseModel = require('./BaseModel');

const mappings = {
    cupoMaximo: 'cupo_maximo',
    imagen: 'imagen_url',
    creadoPor: 'creado_por'
};

module.exports = new BaseModel('servicios', mappings);
