const mongoose = require('mongoose');

const WebConfigSchema = new mongoose.Schema({
    heroTitle: {
        type: String,
        default: 'Juventud Franciscana en el Perú'
    },
    heroSubtitle: {
        type: String,
        default: 'Siguiendo los pasos de San Francisco de Asís y Santa Clara, viviendo el Evangelio en fraternidad, paz y bien.'
    },
    mision: {
        type: String,
        default: 'Vivimos una fe alegre y sencilla, encontrando a Dios en la creación y en el servicio a los hermanos más necesitados.'
    },
    vision: {
        type: String,
        default: 'Crecemos juntos en el conocimiento del Evangelio y el carisma franciscano para ser instrumentos de paz en el mundo.'
    },
    valores: {
        type: String,
        default: 'No caminamos solos. Formamos una familia que se apoya, celebra y vive en comunión constante.'
    },
    fraseInspiradora: {
        type: String,
        default: '"Comienza haciendo lo que es necesario, después lo que es posible y de repente estarás haciendo lo imposible."'
    },
    autorFrase: {
        type: String,
        default: 'San Francisco de Asís'
    },
    emailContacto: {
        type: String,
        default: 'jufrapomalca@gmail.com'
    },
    telefonoContacto: {
        type: String,
        default: '+51 981 574 685'
    },
    facebookUrl: { type: String, default: '' },
    instagramUrl: { type: String, default: '' },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('WebConfig', WebConfigSchema);
