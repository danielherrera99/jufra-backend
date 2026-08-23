const express = require('express');
const router = express.Router();
const MetricaSocial = require('../models/MetricaSocial');

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

// Ruta para forzar actualización manual de métricas (por si el administrador quiere refrescar)
router.post('/sync', async (req, res) => {
    const { fetchMetaStats, fetchYouTubeStats, fetchAnalyticsStats, fetchTikTokStats, fetchInstagramStats } = require('../services/socialMedia');
    
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
        
        res.json({ success: true, message: 'Métricas sincronizadas correctamente', data: resultados });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al sincronizar', error: error.message });
    }
});

module.exports = router;
