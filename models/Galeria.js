const BaseModel = require('./BaseModel');

const mappings = {
    archivoUrl: 'archivo_url',
    tipoArchivo: 'tipo_archivo',
    subidoPor: 'subido_por',
    fraternidadId: 'fraternidad_id',
    esNacional: 'es_nacional'
};

module.exports = new BaseModel('galeria', mappings);
