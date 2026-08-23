/**
 * Servicio para consultar las APIs de Redes Sociales
 * y obtener las métricas de Jufra-Pomalca
 */

// Función para TikTok usando RapidAPI
async function fetchTikTokStats() {
    try {
        console.log('Consultando API de TikTok (vía RapidAPI)...');
        
        const username = process.env.TIKTOK_USERNAME;
        const apiKey = process.env.RAPIDAPI_KEY;
        
        if (!username || !apiKey) {
            throw new Error('Faltan credenciales de RapidAPI o TikTok username');
        }

        const url = `https://tiktok-video-no-watermark2.p.rapidapi.com/user/info?unique_id=${username}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'tiktok-video-no-watermark2.p.rapidapi.com',
                'x-rapidapi-key': apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.code !== 0 || !data.data || !data.data.stats) {
            throw new Error(data.msg || 'Error al obtener datos de TikTok');
        }

        const stats = data.data.stats;
        
        return { 
            plataforma: 'tiktok', 
            seguidores: stats.followerCount, 
            alcance: stats.videoCount, // Usamos videoCount o views
            interacciones: stats.heartCount, // Total de likes
            success: true 
        };
    } catch (error) {
        console.error('Error al obtener datos de TikTok:', error.message);
        return { plataforma: 'tiktok', error: error.message, success: false };
    }
}

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;

// Función temporal para Facebook/Instagram
async function fetchMetaStats() {
    try {
        console.log('Consultando API de Facebook (Meta)...');
        
        // Hacer fetch a la API Graph de Facebook
        const response = await fetch(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}?fields=followers_count,fan_count&access_token=${FB_ACCESS_TOKEN}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        return { 
            plataforma: 'facebook', 
            success: true, 
            seguidores: data.followers_count || data.fan_count || 0,
            alcance: 0, // Reach usually requires Insights API which needs more permissions
            interacciones: 0 
        };
    } catch (error) {
        console.error('Error al obtener datos de Facebook:', error);
        return { plataforma: 'facebook', success: false, error: error.message };
    }
}

const { google } = require('googleapis');

// TODO: Configurar credenciales cuando el usuario las envíe
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
// const GA_PROPERTY_ID = process.env.GA_PROPERTY_ID;

// Función para Instagram usando Graph API
async function fetchInstagramStats() {
    try {
        console.log('Consultando API de Instagram (Graph API)...');
        const token = process.env.FB_ACCESS_TOKEN;
        const pageId = process.env.FB_PAGE_ID;

        if (!token || !pageId) {
            throw new Error('Faltan credenciales de Facebook/Meta en .env');
        }

        // 1. Obtener el ID de Instagram asociado a la página
        const pageUrl = `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${token}`;
        const pageRes = await fetch(pageUrl);
        const pageData = await pageRes.json();
        
        if (!pageData.instagram_business_account) {
            throw new Error('No hay cuenta de Instagram conectada a esta página de Facebook');
        }
        
        const igId = pageData.instagram_business_account.id;

        // 2. Obtener métricas de Instagram
        const igUrl = `https://graph.facebook.com/v19.0/${igId}?fields=followers_count,media_count&access_token=${token}`;
        const igRes = await fetch(igUrl);
        const igData = await igRes.json();

        return {
            plataforma: 'instagram',
            seguidores: igData.followers_count || 0,
            alcance: 0, 
            interacciones: igData.media_count || 0, // Usamos interacciones para guardar la cantidad de posts
            success: true
        };
    } catch (error) {
        console.error('Error al obtener datos de Instagram:', error.message);
        return { plataforma: 'instagram', error: error.message, success: false };
    }
}

// Función para YouTube
async function fetchYouTubeStats() {
    try {
        console.log('Consultando API de YouTube...');
        
        const youtube = google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY });
        const response = await youtube.channels.list({
            part: 'statistics',
            id: YOUTUBE_CHANNEL_ID
        });
        const stats = response.data.items[0].statistics;
        
        
        return { 
            plataforma: 'youtube', 
            seguidores: parseInt(stats.subscriberCount),
            alcance: parseInt(stats.viewCount),
            interacciones: parseInt(stats.videoCount),
            success: true 
        };
    } catch (error) {
        console.error('Error al obtener datos de YouTube:', error);
        return { plataforma: 'youtube', error: error.message, success: false };
    }
}

// Función para Google Analytics
async function fetchAnalyticsStats() {
    try {
        console.log('Consultando API de Google Analytics...');
        
        // Aquí usaremos la cuenta de servicio (JSON)
        const auth = new google.auth.GoogleAuth({
            keyFile: './ga-credentials.json',
            scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
        });
        const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
        
        const response = await analyticsdata.properties.runReport({
            property: `properties/${process.env.GA_PROPERTY_ID}`,
            requestBody: {
                dateRanges: [
                    {
                        startDate: '30daysAgo',
                        endDate: 'today',
                    },
                ],
                metrics: [
                    { name: 'activeUsers' },
                    { name: 'screenPageViews' },
                    { name: 'sessions' }
                ],
            },
        });

        const rows = response.data.rows;
        let usuarios = 0;
        let vistas = 0;
        let sesiones = 0;

        if (rows && rows.length > 0) {
            usuarios = parseInt(rows[0].metricValues[0].value);
            vistas = parseInt(rows[0].metricValues[1].value);
            sesiones = parseInt(rows[0].metricValues[2].value);
        }
        
        return { 
            plataforma: 'web', 
            success: true, 
            seguidores: usuarios, // Usuarios activos
            alcance: vistas, // Vistas de página
            interacciones: sesiones // Sesiones
        };
    } catch(error) {
        console.error('Error al obtener datos de GA4:', error);
        return { plataforma: 'web', success: false, error: error.message };
    }
}

module.exports = {
    fetchMetaStats,
    fetchInstagramStats,
    fetchYouTubeStats,
    fetchAnalyticsStats,
    fetchTikTokStats
};
