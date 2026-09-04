const BaseModel = require('./BaseModel');

const mappings = {
    heroTitle: 'hero_title',
    heroSubtitle: 'hero_subtitle',
    fraseInspiradora: 'frase_inspiradora',
    autorFrase: 'autor_frase',
    emailContacto: 'email_contacto',
    telefonoContacto: 'telefono_contacto',
    mapQuery: 'map_query',
    familiaTitulo: 'familia_titulo',
    familiaDescripcion: 'familia_descripcion',
    ofsHeroTitle: 'ofs_hero_title',
    ofsHeroSubtitle: 'ofs_hero_subtitle',
    ofsMapQuery: 'ofs_map_query',
    facebookUrl: 'facebook_url',
    instagramUrl: 'instagram_url',
    whatsappUrl: 'whatsapp_url',
    tiktokUrl: 'tiktok_url',
    youtubeUrl: 'youtube_url',
    promoActiva: 'promo_activa',
    promoTitulo: 'promo_titulo',
    promoDescripcion: 'promo_descripcion',
    promoImagenUrl: 'promo_imagen_url',
    promoBotonTexto: 'promo_boton_texto',
    promoBotonLink: 'promo_boton_link',
    updatedAt: 'updated_at'
};

module.exports = new BaseModel('web_config', mappings);
