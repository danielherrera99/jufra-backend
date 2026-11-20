const BaseModel = require('./BaseModel');

const mappings = {
    fechaPublicacion: 'fecha_publicacion',
    fechaExpiracion: 'fecha_expiracion',
    autor: 'autor_id',
    destinatarios: 'destinatarios',
    fraternidadId: 'fraternidad_id'
};

module.exports = new BaseModel('anuncios', mappings);
