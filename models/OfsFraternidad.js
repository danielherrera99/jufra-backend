const BaseModel = require('./BaseModel');

const mappings = {
    enlaceWeb: 'enlace_web',
    enlaceSocial: 'enlace_social',
    imagenUrl: 'imagen_url',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
};

module.exports = new BaseModel('ofs_fraternidades', mappings);
