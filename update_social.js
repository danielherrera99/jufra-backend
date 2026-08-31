require('dotenv').config();
const { fetchFacebookPosts, fetchInstagramPosts, fetchYouTubeVideos, fetchTikTokVideos } = require('./services/socialMedia');
const db = require('./db');

async function updatePosts() {
    console.log('Recopilando publicaciones recientes y descargando imagenes localmente...');
    try {
        const postsFb = await fetchFacebookPosts();
        const postsIg = await fetchInstagramPosts();
        const postsYt = await fetchYouTubeVideos();
        const postsTk = await fetchTikTokVideos();
        
        const listadosPosts = [postsFb, postsIg, postsYt, postsTk];
        
        for (const listado of listadosPosts) {
            if (listado.success && listado.data && listado.data.length > 0) {
                for (const post of listado.data) {
                    await db.raw(`
                        INSERT INTO publicaciones_sociales (plataforma, post_id, url, titulo, fecha_publicacion, vistas, likes, comentarios, imagen_url)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (post_id) 
                        DO UPDATE SET 
                            vistas = EXCLUDED.vistas,
                            likes = EXCLUDED.likes,
                            comentarios = EXCLUDED.comentarios,
                            imagen_url = EXCLUDED.imagen_url,
                            updated_at = NOW()
                    `, [post.plataforma, post.post_id, post.url, post.titulo, post.fecha_publicacion, post.vistas, post.likes, post.comentarios, post.imagen_url]);
                }
                console.log(`Guardados/Actualizados ${listado.data.length} posts de ${listado.data[0].plataforma}`);
            } else {
                console.error('Error o sin posts:', listado.plataforma, listado.error);
            }
        }
        console.log('Update completo.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updatePosts();
