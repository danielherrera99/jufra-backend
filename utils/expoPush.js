/**
 * Helper para enviar notificaciones push usando la API de Expo
 */

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

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const rec = await response.json();
        console.log('Push notifications sent:', rec);
    } catch (error) {
        console.error('Error sending push notifications:', error);
    }
};

module.exports = {
    enviarNotificacionGrupal
};
