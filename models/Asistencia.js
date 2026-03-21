const mongoose = require('mongoose');

const AsistenciaSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: false // Ahora opcional para permitir invitados
    },
    nombreInvitado: {
        type: String,
        trim: true // Para personas sin cuenta
    },
    fecha: {
        type: Date,
        required: true,
        default: Date.now
    },
    tipoReunion: {
        type: String,
        enum: ['semanal', 'consejo', 'formacion', 'apostolado', 'especial'],
        default: 'semanal'
    },
    presente: {
        type: Boolean,
        default: true
    },
    estado: {
        type: String,
        enum: ['presente', 'ausente', 'justificado'],
        default: 'presente'
    },
    metodoRegistro: {
        type: String,
        enum: ['qr', 'manual', 'automatico'],
        default: 'manual'
    },
    observaciones: {
        type: String,
        trim: true
    },
    registradoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario'
    }
}, {
    timestamps: true
});

// Índice compuesto para evitar duplicados
AsistenciaSchema.index({ usuario: 1, fecha: 1, tipoReunion: 1 }, { unique: true });

module.exports = mongoose.model('Asistencia', AsistenciaSchema);
