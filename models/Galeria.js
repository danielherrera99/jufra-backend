const BaseModel = require('./BaseModel');

const mappings = {
    archivoUrl: 'archivo_url',
    tipoArchivo: 'tipo_archivo',
    subidoPor: 'subido_por'
};

module.exports = new BaseModel('galeria', mappings);
