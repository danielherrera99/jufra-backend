const BaseModel = require('./BaseModel');

const mappings = {
    contactoEmergencia: 'contacto_emergencia',
    nombreContactoEmergencia: 'nombre_contacto_emergencia',
    fechaNacimiento: 'fecha_nacimiento',
    fechaIngreso: 'fecha_ingreso',
    fechaPromesa: 'fecha_promesa',
    foto: 'foto_url',
    codigoQR: 'codigo_qr',
    expoPushToken: 'expo_push_token',
    resetPasswordCode: 'reset_password_code',
    resetPasswordExpire: 'reset_password_expire'
};

module.exports = new BaseModel('usuarios', mappings);
