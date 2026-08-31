const db = require('./db');
const Anuncio = require('./models/Anuncio');

async function main() {
    try {
        const params = { destinatarios: 'app' };
        
        // Exact logic from backend routes/anuncios.js
        const filtro = { activo: true };
        const destinatarios = params.destinatarios;
        if (destinatarios) {
            if (destinatarios === 'app') {
                filtro.destinatarios = { $in: ['app', 'todos'] }; // assuming non-admin mobile user
            } 
        }
        filtro.$or = [
            { fechaExpiracion: null },
            { fechaExpiracion: { $gt: new Date() } }
        ];

        const anuncios = await Anuncio.find(filtro)
            .populate('autor', 'nombre apellido cargo foto')
            .sort({ destacado: -1, prioridad: -1, fechaPublicacion: -1 });
            
        console.log('Total returned:', anuncios.length);
        console.log(anuncios.map(a => ({ 
            titulo: a.titulo, 
            tipo: a.tipo, 
            destinatarios: a.destinatarios,
            fecha_publicacion: a.fechaPublicacion 
        })));
    } catch(e) {
        console.error(e)
    } finally {
        process.exit(0);
    }
}
main();
