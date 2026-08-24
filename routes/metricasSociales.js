const express = require('express');
const router = express.Router();
const MetricaSocial = require('../models/MetricaSocial');
const PublicacionSocial = require('../models/PublicacionSocial');

// Obtener todas las métricas sociales
router.get('/', async (req, res) => {
    try {
        const metricas = await MetricaSocial.find().sort({ fecha: 1 });
        
        // Agrupar por plataforma para que sea fácil consumirlo en el frontend
        const agrupado = {
            facebook: metricas.filter(m => m.plataforma === 'facebook'),
            youtube: metricas.filter(m => m.plataforma === 'youtube'),
            web: metricas.filter(m => m.plataforma === 'web'),
            tiktok: metricas.filter(m => m.plataforma === 'tiktok'),
            instagram: metricas.filter(m => m.plataforma === 'instagram')
        };
        
        res.json({
            success: true,
            data: agrupado
        });
    } catch (error) {
        console.error('Error al obtener métricas:', error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// Obtener las últimas publicaciones de una plataforma específica
router.get('/publicaciones/:plataforma', async (req, res) => {
    try {
        const { plataforma } = req.params;
        const limit = parseInt(req.query.limit) || 15;
        
        const posts = await PublicacionSocial.find({ plataforma })
            .sort({ fechaPublicacion: -1 })
            .limit(limit);
            
        res.json({
            success: true,
            data: posts
        });
    } catch (error) {
        console.error(`Error al obtener publicaciones de ${req.params.plataforma}:`, error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// Actualizar estado 'activo' de una publicación raspada
router.put('/publicaciones/:post_id', async (req, res) => {
    try {
        const { post_id } = req.params;
        const db = require('../db');
        let activo = req.body.activo;
        if (activo === 'true' || activo === true) activo = true;
        else activo = false;

        await db.raw('UPDATE publicaciones_sociales SET activo = ? WHERE post_id = ?', [activo, post_id]);
        
        res.json({ success: true, message: 'Estado actualizado' });
    } catch (error) {
        console.error('Error al actualizar publicacion:', error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// Ruta para forzar actualización manual de métricas (por si el administrador quiere refrescar)
router.post('/sync', async (req, res) => {
    const { fetchMetaStats, fetchYouTubeStats, fetchAnalyticsStats, fetchTikTokStats, fetchInstagramStats, fetchFacebookPosts, fetchInstagramPosts, fetchYouTubeVideos, fetchTikTokVideos } = require('../services/socialMedia');
    const db = require('../db');
    
    try {
        const fb = await fetchMetaStats();
        const ig = await fetchInstagramStats();
        const yt = await fetchYouTubeStats();
        const ga = await fetchAnalyticsStats();
        const tk = await fetchTikTokStats();
        
        const fechaActual = new Date().toISOString().split('T')[0];
        const resultados = [fb, ig, yt, ga, tk];
        
        for (const r of resultados) {
            if (r.success) {
                // Borrar si ya existe una métrica para hoy de esa plataforma (para no duplicar)
                const existentes = await MetricaSocial.find({ fecha: fechaActual, plataforma: r.plataforma });
                for (const ex of existentes) {
                    await ex.deleteOne();
                }
                
                await MetricaSocial.create({
                    fecha: fechaActual,
                    plataforma: r.plataforma,
                    seguidores: r.seguidores,
                    alcance: r.alcance,
                    interacciones: r.interacciones
                });
            }
        }
        
        // Sincronizar posts
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
                            updated_at = NOW()
                    `, [post.plataforma, post.post_id, post.url, post.titulo, post.fecha_publicacion, post.vistas, post.likes, post.comentarios, post.imagen_url]);
                }
            }
        }
        
        res.json({ success: true, message: 'Métricas y posts actualizados correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al sincronizar', error: error.message });
    }
});

module.exports = router;
