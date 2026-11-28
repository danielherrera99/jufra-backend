const BaseModel = require('./BaseModel');

const mappings = {
    enlaceSocial: 'enlace_social',
    horarioReunion: 'horario_reunion',
    bannerUrl: 'banner_url',
    logoUrl: 'logo_url'
};

module.exports = new BaseModel('fraternidades', mappings);
