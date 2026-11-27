const BaseModel = require('./BaseModel');

const mappings = {
    remitente: 'remitente_id',
    destinatario: 'destinatario_id',
    fraternidadId: 'fraternidad_id'
};

module.exports = new BaseModel('mensajes', mappings);
