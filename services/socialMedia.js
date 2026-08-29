/**
 * Servicio para consultar las APIs de Redes Sociales
 * y obtener las métricas de Jufra-Pomalca
 */

// Función para TikTok usando RapidAPI
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
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

// Funciones para extraer PUBLICACIONES INDIVIDUALES

async function fetchFacebookPosts() {
    try {
        const token = process.env.FB_ACCESS_TOKEN;
        const pageId = process.env.FB_PAGE_ID;
        if (!token || !pageId) return { plataforma: 'facebook', success: false, error: 'Credenciales faltantes' };

        const url = `https://graph.facebook.com/v19.0/${pageId}/published_posts?fields=id,message,created_time,permalink_url,full_picture,shares,likes.summary(true),comments.summary(true)&limit=15&access_token=${token}`;
        const res = await fetch(url).then(r => r.json());
        
        if (!res.data) return { plataforma: 'facebook', success: true, data: [] };

        const posts = res.data.map(p => ({
            plataforma: 'facebook',
            post_id: p.id,
            url: p.permalink_url || `https://facebook.com/${p.id}`,
            titulo: p.message || 'Sin descripción',
            fecha_publicacion: p.created_time,
            vistas: 0,
            likes: p.likes ? p.likes.summary.total_count : 0,
            comentarios: p.comments ? p.comments.summary.total_count : 0,
            imagen_url: p.full_picture || null
        }));

        return { plataforma: 'facebook', success: true, data: posts };
    } catch (error) {
        return { plataforma: 'facebook', success: false, error: error.message };
    }
}

async function fetchInstagramPosts() {
    try {
        const token = process.env.FB_ACCESS_TOKEN;
        const pageId = process.env.FB_PAGE_ID;
        if (!token || !pageId) return { plataforma: 'instagram', success: false, error: 'Credenciales faltantes' };

        const pageUrl = `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${token}`;
        const pageRes = await fetch(pageUrl).then(r => r.json());
        
        if (!pageRes.instagram_business_account) return { plataforma: 'instagram', success: false, error: 'No IG linked' };
        
        const igId = pageRes.instagram_business_account.id;
        const igUrl = `https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,media_url,permalink,timestamp,like_count,comments_count,media_type,thumbnail_url&limit=15&access_token=${token}`;
        const igRes = await fetch(igUrl).then(r => r.json());

        if (!igRes.data) return { plataforma: 'instagram', success: true, data: [] };

        const posts = igRes.data.map(p => ({
            plataforma: 'instagram',
            post_id: p.id,
            url: p.permalink,
            titulo: p.caption || 'Sin descripción',
            fecha_publicacion: p.timestamp,
            vistas: 0,
            likes: p.like_count || 0,
            comentarios: p.comments_count || 0,
            imagen_url: p.media_type === 'VIDEO' ? (p.thumbnail_url || p.media_url) : p.media_url
        }));

        return { plataforma: 'instagram', success: true, data: posts };
    } catch (error) {
        return { plataforma: 'instagram', success: false, error: error.message };
    }
}

async function fetchYouTubeVideos() {
    try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        const channelId = process.env.YOUTUBE_CHANNEL_ID;
        if (!apiKey || !channelId) return { plataforma: 'youtube', success: false, error: 'Credenciales faltantes' };

        const playlistId = channelId.replace('UC', 'UU');
        const listUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=15&key=${apiKey}`;
        const listRes = await fetch(listUrl).then(r => r.json());
        
        if (!listRes.items || listRes.items.length === 0) return { plataforma: 'youtube', success: true, data: [] };

        const videoIds = listRes.items.map(i => i.contentDetails.videoId).join(',');
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`;
        const statsRes = await fetch(statsUrl).then(r => r.json());

        const posts = statsRes.items.map(v => ({
            plataforma: 'youtube',
            post_id: v.id,
            url: `https://www.youtube.com/watch?v=${v.id}`,
            titulo: v.snippet.title,
            fecha_publicacion: v.snippet.publishedAt,
            vistas: parseInt(v.statistics.viewCount) || 0,
            likes: parseInt(v.statistics.likeCount) || 0,
            comentarios: parseInt(v.statistics.commentCount) || 0,
            imagen_url: v.snippet.thumbnails.medium ? v.snippet.thumbnails.medium.url : (v.snippet.thumbnails.default ? v.snippet.thumbnails.default.url : null)
        }));

        return { plataforma: 'youtube', success: true, data: posts };
    } catch (error) {
        return { plataforma: 'youtube', success: false, error: error.message };
    }
}

async function fetchTikTokVideos() {
    try {
        const apiKey = process.env.RAPIDAPI_KEY;
        const username = process.env.TIKTOK_USERNAME;
        if (!apiKey || !username) return { plataforma: 'tiktok', success: false, error: 'Credenciales faltantes' };

        const url = `https://tiktok-video-no-watermark2.p.rapidapi.com/user/posts?unique_id=${username}&count=15`;
        const res = await fetch(url, { headers: { 'x-rapidapi-host': 'tiktok-video-no-watermark2.p.rapidapi.com', 'x-rapidapi-key': apiKey } }).then(r => r.json());

        if (!res.data || !res.data.videos) return { plataforma: 'tiktok', success: true, data: [] };

        const posts = [];
        for (const v of res.data.videos) {
            let imagen_url = v.cover || null;
            if (imagen_url) {
                try {
                    const uploadRes = await cloudinary.uploader.upload(imagen_url, { folder: 'tiktok_covers' });
                    imagen_url = uploadRes.secure_url;
                } catch (e) {
                    console.error('Error subiendo cover a Cloudinary:', e.message);
                }
            }
            posts.push({
                plataforma: 'tiktok',
                post_id: v.video_id,
                url: `https://www.tiktok.com/@${username}/video/${v.video_id}`,
                titulo: v.title || 'Sin descripción',
                fecha_publicacion: new Date(v.create_time * 1000).toISOString(),
                vistas: v.play_count || 0,
                likes: v.digg_count || 0,
                comentarios: v.comment_count || 0,
                imagen_url: imagen_url
            });
        }

        return { plataforma: 'tiktok', success: true, data: posts };
    } catch (error) {
        return { plataforma: 'tiktok', success: false, error: error.message };
    }
}

module.exports = {
    fetchMetaStats,
    fetchInstagramStats,
    fetchYouTubeStats,
    fetchAnalyticsStats,
    fetchTikTokStats,
    fetchFacebookPosts,
    fetchInstagramPosts,
    fetchYouTubeVideos,
    fetchTikTokVideos
};
