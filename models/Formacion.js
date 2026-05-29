const BaseModel = require('./BaseModel');

const mappings = {
    autor: 'autor',
    archivoUrl: 'archivo_url',
    archivoNombre: 'archivo_nombre'
};

module.exports = new BaseModel('formaciones', mappings);
