const BaseModel = require('./BaseModel');

const mappings = {
    nombreInvitado: 'nombre_invitado',
    tipoReunion: 'tipo_reunion',
    metodoRegistro: 'metodo_registro',
    registradoPor: 'registrado_por',
    usuario: 'usuario_id'
};

module.exports = new BaseModel('asistencias', mappings);
