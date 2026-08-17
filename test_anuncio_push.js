const db = require('./db');
const Usuario = require('./models/Usuario');
const Anuncio = require('./models/Anuncio');
const { enviarNotificacionGrupal } = require('./utils/expoPush');

async function test() {
    try {
        console.log('Buscando usuarios...');
        const usuariosActivos = await Usuario.find({ activo: true, expoPushToken: { $ne: null } });
        const tokens = usuariosActivos.map(u => u.expoPushToken);
        console.log('Tokens encontrados:', tokens.length);
        
        if (tokens.length > 0) {
            console.log('Enviando notificacion...');
            const res = await enviarNotificacionGrupal(
                tokens, 
                '🚨 Nuevo Anuncio: TEST LOCAL', 
                'Este es un mensaje de prueba desde el servidor local',
                { id: '123', tipo: 'anuncio' }
            );
            console.log('Resultado:', res);
        }
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}
test();
