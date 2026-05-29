const BaseModel = require('./BaseModel');

const mappings = {
    creadoPor: 'creado_por',
    createdAt: 'created_at'
};

module.exports = new BaseModel('espiritualidad', mappings);
