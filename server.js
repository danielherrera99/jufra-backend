const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Inicializar Express
const app = express();

// Middleware
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Conectar a Supabase PostgreSQL y verificar usuario por defecto
const db = require('./db');
const bcrypt = require('bcryptjs');

db.raw('SELECT 1')
    .then(async () => {
        console.log('✅ Base de datos PostgreSQL conectada exitosamente');

        // Crear o actualizar usuario por defecto
        try {
            const usuarioJufra = await db('usuarios').where('username', 'Jufra').first();
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('201599', salt);

            if (!usuarioJufra) {
                // Crear si no existe
                await db('usuarios').insert({
                    nombre: 'Administrador',
                    apellido: 'JUFRA',
                    username: 'Jufra',
                    password: hashedPassword,
                    rol: 'admin',
                    cargo: 'coordinador',
                    email: 'admin@jufra.com',
                    activo: true
                });
                console.log('👤 Usuario por defecto "Jufra" creado exitosamente');
            } else {
                // Actualizar contraseña si ya existe (para asegurar acceso)
                await db('usuarios').where('id', usuarioJufra.id).update({
                    password: hashedPassword,
                    rol: 'admin', // Asegurar rol admin
                    activo: true, // Asegurar que esté activo
                    email: usuarioJufra.email || 'admin@jufra.com',
                    updated_at: new Date()
                });
                console.log('🔄 Usuario por defecto "Jufra" actualizado/verificado');
            }
        } catch (error) {
            console.error('❌ Error al gestionar usuario por defecto:', error);
        }
    })
    .catch((err) => {
        console.error('❌ Error al conectar a PostgreSQL:', err.message);
    });

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hermanos', require('./routes/hermanos'));
app.use('/api/asistencia', require('./routes/asistencia'));
app.use('/api/actas', require('./routes/actas'));
app.use('/api/anuncios', require('./routes/anuncios'));
app.use('/api/formacion', require('./routes/formacion'));
app.use('/api/eventos', require('./routes/eventos'));
app.use('/api/cantos', require('./routes/cantos'));

app.use('/api/peticiones', require('./routes/peticiones'));
app.use('/api/documentos', require('./routes/documentos'));
app.use('/api/galeria', require('./routes/galeria'));
app.use('/api/servicios', require('./routes/servicios'));
app.use('/api/espiritualidad', require('./routes/espiritualidad'));
app.use('/api/mensajes', require('./routes/mensajes'));
app.use('/api/solicitudes', require('./routes/solicitudes'));
app.use('/api/fraternidades', require('./routes/fraternidades'));
app.use('/api/web-config', require('./routes/webConfig'));
app.use('/api/ofs-config', require('./routes/ofsConfig'));
app.use('/api/redes', require('./routes/redes'));
app.use('/api/metricas-sociales', require('./routes/metricasSociales'));
app.use('/api/galeria-web', require('./routes/galeriaWeb'));
app.use('/api/quienes-somos', require('./routes/quienesSomos'));
app.use('/api/finanzas', require('./routes/finanzas'));

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        message: '🕊️ JUFRA API - Bienvenido',
        version: '1.0.0',
        status: 'active'
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Puerto
const PORT = process.env.PORT || 5000;

// Iniciar tareas automáticas (Cron Jobs)
const { startCronJobs } = require('./jobs/cronJobs');
startCronJobs();

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
});

module.exports = app;
