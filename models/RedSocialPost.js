const BaseModel = require('./BaseModel');

const mappings = {
    mostrarEnTodos: 'mostrar_en_todos',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
};

module.exports = new BaseModel('redes_sociales', mappings);
