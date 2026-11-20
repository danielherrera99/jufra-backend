const knex = require('knex');
const dotenv = require('dotenv');

const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '.env') });

const db = knex({
    client: 'pg',
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Requerido para conexiones seguras en Render/producción
    },
    pool: {
        min: 2,
        max: 10,
        createTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
    }
});

// Probar conexión inicial
db.raw('SELECT 1')
    .then(() => {
        console.log('✅ Conexión exitosa a Supabase PostgreSQL (vía Knex)');
    })
    .catch((err) => {
        console.error('❌ Error de conexión a Supabase PostgreSQL:', err.message);
    });

module.exports = db;
