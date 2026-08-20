const BaseModel = require('./BaseModel');

const mappings = {
    nombre: 'nombre',
    rol: 'rol',
    categoria: 'categoria',
    descripcion: 'descripcion',
    fotoUrl: 'foto_url',
    orden: 'orden',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
};

module.exports = new BaseModel('quienes_somos', mappings);
