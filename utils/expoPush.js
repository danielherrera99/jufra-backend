/**
 * Helper para enviar notificaciones push usando la API de Expo
 */

const https = require('https');

const enviarNotificacionGrupal = async (tokens, titulo, mensaje, data = {}) => {
    if (!tokens || tokens.length === 0) return;

    // Remove duplicates or nulls
    const pushTokens = [...new Set(tokens.filter(t => t && t.startsWith('ExponentPushToken')))];
    
    if (pushTokens.length === 0) return;

    const messages = pushTokens.map(pushToken => ({
        to: pushToken,
        sound: 'default',
        title: titulo,
        body: mensaje,
        data: data,
    }));

    // Use native https for broader Node version compatibility
    // Enviar individualmente para evitar errores PUSH_TOO_MANY_EXPERIENCE_IDS
    // cuando hay tokens mezclados de Expo Go y APKs en producción.
    const sendPush = (message) => {
        return new Promise((resolve) => {
            const body = JSON.stringify(message);
            const req = https.request({
                hostname: 'exp.host',
                port: 443,
                path: '/--/api/v2/push/send',
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            }, (res) => {
                let resData = '';
                res.on('data', chunk => { resData += chunk; });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(resData);
                        resolve(parsed);
                    } catch (e) {
                        resolve({ error: 'Parse error' });
                    }
                });
            });

            req.on('error', (e) => resolve({ error: e.message }));
            req.write(body);
            req.end();
        });
    };

    try {
        const results = await Promise.all(messages.map(msg => sendPush(msg)));
        console.log('Push notifications sent result summary:', results.length);
        return results;
    } catch (e) {
        console.error('Error in batch sending:', e);
        return [];
    }
};

module.exports = {
    enviarNotificacionGrupal
};
