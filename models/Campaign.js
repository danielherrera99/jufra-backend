const BaseModel = require('./BaseModel');

const mappings = {
    titulo: 'titulo',
    descripcion: 'descripcion',
    fechaHora: 'fecha_hora',
    ubicacionTexto: 'ubicacion',
    mapQuery: 'map_query',
    latitud: 'latitud',
    longitud: 'longitud',
    cronograma: 'cronograma', // JSONB
    reglas: 'reglas', // JSONB
    isActive: 'is_active',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
};

module.exports = new BaseModel('campaigns', mappings);
