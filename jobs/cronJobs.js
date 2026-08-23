const cron = require('node-cron');
const { fetchMetaStats, fetchYouTubeStats, fetchAnalyticsStats, fetchInstagramStats, fetchTikTokStats, fetchFacebookPosts, fetchInstagramPosts, fetchYouTubeVideos, fetchTikTokVideos } = require('../services/socialMedia');
const MetricaSocial = require('../models/MetricaSocial');

// Programar la tarea para que se ejecute todos los días a las 3:00 AM
// El formato del cron es: 'minuto hora dia_del_mes mes dia_de_la_semana'
// '0 3 * * *' = todos los días a las 03:00 AM
const cronSchedule = '0 3 * * *';

function startCronJobs() {
    console.log(`[Cron] Tarea automática programada: Recopilación de métricas (Hora: ${cronSchedule})`);

    cron.schedule(cronSchedule, async () => {
        console.log('[Cron] Ejecutando recopilación de métricas sociales...');
        const fechaActual = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

        try {
            // 1. Obtener datos
            const fb = await fetchMetaStats();
            const ig = await fetchInstagramStats();
            const yt = await fetchYouTubeStats();
            const ga = await fetchAnalyticsStats();
            const tk = await fetchTikTokStats();
            
            const resultados = [fb, ig, yt, ga, tk];

            // 2. Guardar en Base de Datos
            for (const resultado of resultados) {
                if (resultado.success) {
                    const datosParaGuardar = {
                        fecha: fechaActual,
                        plataforma: resultado.plataforma,
                        seguidores: resultado.seguidores,
                        alcance: resultado.alcance,
                        interacciones: resultado.interacciones
                    };
                    
                    await MetricaSocial.create(datosParaGuardar);
                    console.log(`[Cron] ✅ Métricas guardadas para ${resultado.plataforma}`);
                } else {
                    console.error(`[Cron] ❌ Error al obtener ${resultado.plataforma}: ${resultado.error}`);
                }
            }
            
            console.log('[Cron] Métricas generales guardadas.');

            // 3. Obtener y guardar posts individuales
            console.log('[Cron] Recopilando publicaciones recientes...');
            const postsFb = await fetchFacebookPosts();
            const postsIg = await fetchInstagramPosts();
            const postsYt = await fetchYouTubeVideos();
            const postsTk = await fetchTikTokVideos();
            
            const listadosPosts = [postsFb, postsIg, postsYt, postsTk];
            const db = require('../db');
            
            for (const listado of listadosPosts) {
                if (listado.success && listado.data && listado.data.length > 0) {
                    for (const post of listado.data) {
                        // Upsert: Si el post_id ya existe, actualiza sus vistas, likes y comentarios
                        await db.raw(`
                            INSERT INTO publicaciones_sociales (plataforma, post_id, url, titulo, fecha_publicacion, vistas, likes, comentarios, imagen_url)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT (post_id) 
                            DO UPDATE SET 
                                vistas = EXCLUDED.vistas,
                                likes = EXCLUDED.likes,
                                comentarios = EXCLUDED.comentarios,
                                updated_at = NOW()
                        `, [post.plataforma, post.post_id, post.url, post.titulo, post.fecha_publicacion, post.vistas, post.likes, post.comentarios, post.imagen_url]);
                    }
                    console.log(`[Cron] Guardados/Actualizados ${listado.data.length} posts de ${listado.data[0].plataforma}`);
                }
            }

            console.log('[Cron] ¡Recopilación completa!');

        } catch (error) {
            console.error('[Cron] Error grave durante la recopilación:', error);
        }
    }, {
        timezone: "America/Lima" // Se asegura de que sea a las 3 AM hora de Perú
    });
}

module.exports = { startCronJobs };
