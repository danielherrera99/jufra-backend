const BaseModel = require('./BaseModel');

const mappings = {
    plataforma: 'plataforma',
    postId: 'post_id',
    url: 'url',
    titulo: 'titulo',
    fechaPublicacion: 'fecha_publicacion',
    vistas: 'vistas',
    likes: 'likes',
    comentarios: 'comentarios',
    imagenUrl: 'imagen_url',
    mostrarEnTodos: 'mostrar_en_todos',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
};

module.exports = new BaseModel('publicaciones_sociales', mappings);
