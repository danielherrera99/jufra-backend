const BaseModel = require('./BaseModel');

const mappings = {
    fraternidadId: 'fraternidad_id',
    foto: 'foto_url',
    creadoPor: 'creado_por'
};

module.exports = new BaseModel('inventario', mappings);
