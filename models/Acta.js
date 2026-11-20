const BaseModel = require('./BaseModel');

const mappings = {
    tipoReunion: 'tipo_reunion',
    archivoPDF: 'archivo_pdf_url',
    creadoPor: 'creado_por',
    fraternidadId: 'fraternidad_id'
};

module.exports = new BaseModel('actas', mappings);
