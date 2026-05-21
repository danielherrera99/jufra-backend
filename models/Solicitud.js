const mongoose = require('mongoose');

const SolicitudSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true
    },
    edad: {
        type: Number,
        required: [true, 'La edad es obligatoria']
    },
    telefono: {
        type: String,
        required: [true, 'El teléfono es obligatorio'],
        trim: true
    },
    estado: {
        type: String,
        enum: ['pendiente', 'contactado', 'descartado'],
        default: 'pendiente'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Solicitud', SolicitudSchema);
