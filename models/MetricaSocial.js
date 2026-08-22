const BaseModel = require('./BaseModel');

const mappings = {
    fecha: 'fecha',
    plataforma: 'plataforma',
    seguidores: 'seguidores',
    alcance: 'alcance',
    interacciones: 'interacciones',
    createdAt: 'created_at'
};

module.exports = new BaseModel('metricas_sociales', mappings);
