const BaseModel = require('./BaseModel');

const mappings = {
    archivoUrl: 'archivo_url',
    archivoNombre: 'archivo_nombre',
    creadoPor: 'creado_por'
};

module.exports = new BaseModel('documentos', mappings);
