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
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('OfsConfig', OfsConfigSchema);
