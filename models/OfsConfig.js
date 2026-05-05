const mongoose = require('mongoose');

const OfsConfigSchema = new mongoose.Schema({
    heroTitle: {
        type: String,
        default: 'Fraternidad OFS Santa Isabel de Hungría'
    },
    heroSubtitle: {
        type: String,
        default: 'Orden Franciscana Seglar: Viviendo el Evangelio en medio del mundo.'
    },
    mapQuery: {
        type: String,
        default: 'Convento San Antonio de Padua, Chiclayo, Perú'
    },
    quienesSomos: {
        type: String,
        default: 'Caminamos junto a nuestros hermanos mayores de la Orden Franciscana Seglar, quienes nos acompañan y guían en nuestro camino de fe y servicio.'
    },
    footerDireccion: {
        type: String,
        default: 'Convento San Antonio de Padua, Chiclayo, Perú'
    },
    footerEmail: {
        type: String,
        default: 'jufrapomalca@gmail.com'
    },
    footerTelefono: {
        type: String,
        default: '+51 979 948 528'
    },
    bannerTitle: {
        type: String,
        default: ''
    },
    bannerDescription: {
        type: String,
        default: ''
    },
    bannerImage: {
        type: String,
        default: ''
    },
    bannerActive: {
        type: Boolean,
        default: false
    },
    bannerLink: {
        type: String,
        default: ''
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('OfsConfig', OfsConfigSchema);
