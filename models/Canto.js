const BaseModel = require('./BaseModel');

const mappings = {
    creadoPor: 'creado_por',
    archivoUrl: 'archivo_url',
    archivoNombre: 'archivo_nombre'
};

module.exports = new BaseModel('cantos', mappings);
