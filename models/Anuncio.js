const BaseModel = require('./BaseModel');

const mappings = {
    fechaPublicacion: 'fecha_publicacion',
    fechaExpiracion: 'fecha_expiracion',
    autor: 'autor_id',
    destinatarios: 'destinatarios'
};

module.exports = new BaseModel('anuncios', mappings);
