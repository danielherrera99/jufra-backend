const BaseModel = require('./BaseModel');

const mappings = {
    heroTitle: 'hero_title',
    heroSubtitle: 'hero_subtitle',
    mapQuery: 'map_query',
    quienesSomos: 'quienes_somos',
    footerDireccion: 'footer_direccion',
    footerEmail: 'footer_email',
    footerTelefono: 'footer_telefono',
    bannerTitle: 'banner_title',
    bannerDescription: 'banner_description',
    bannerImage: 'banner_image',
    bannerActive: 'banner_active',
    bannerLink: 'banner_link',
    updatedAt: 'updated_at'
};

module.exports = new BaseModel('ofs_config', mappings);
