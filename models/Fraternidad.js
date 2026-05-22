const mongoose = require('mongoose');

const FraternidadSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre de la fraternidad es obligatorio'],
        trim: true
    },
    departamento: {
        type: String,
        required: [true, 'El departamento es obligatorio'],
        trim: true
    },
    parroquia: {
        type: String,
        trim: true,
        default: ''
    },
    zona: {
        type: String,
        required: [true, 'La zona es obligatoria'],
        enum: ['norte', 'centro', 'sur', 'sur_altiplano', 'lima_callao_sur_medio'],
        default: 'centro'
    },
    contacto: {
        type: String,
        trim: true,
        default: ''
    },
    telefono: {
        type: String,
        trim: true,
        default: ''
    },
    enlaceSocial: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Fraternidad', FraternidadSchema);
