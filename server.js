const express = require('express');
const mongoose = require('mongoose');
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

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
        console.log('✅ MongoDB conectado exitosamente');

        // Crear o actualizar usuario por defecto
        try {
            const Usuario = require('./models/Usuario');
            let usuarioJufra = await Usuario.findOne({ username: 'Jufra' });

            if (!usuarioJufra) {
                // Crear si no existe
                usuarioJufra = new Usuario({
                    nombre: 'Administrador',
                    apellido: 'JUFRA',
                    username: 'Jufra',
                    password: '201599',
                    rol: 'admin',
                    cargo: 'coordinador',
                    etapaFormacion: 'promesado',
                    email: 'admin@jufra.com',
                    activo: true
                });
                await usuarioJufra.save();
                console.log('👤 Usuario por defecto "Jufra" creado exitosamente');
            } else {
                // Actualizar contraseña si ya existe (para asegurar acceso)
                usuarioJufra.password = '201599';
                usuarioJufra.rol = 'admin'; // Asegurar rol admin
                usuarioJufra.activo = true; // Asegurar que esté activo
                if (!usuarioJufra.email) usuarioJufra.email = 'admin@jufra.com';
                await usuarioJufra.save(); // Esto disparará el pre-save hook y hasheará el password
                console.log('🔄 Usuario por defecto "Jufra" actualizado/verificado');
            }
        } catch (error) {
            console.error('❌ Error al gestionar usuario por defecto:', error);
        }
    })
    .catch((err) => console.error('❌ Error al conectar MongoDB:', err));

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

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
});

module.exports = app;
