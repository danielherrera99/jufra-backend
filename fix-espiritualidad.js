const db = require('./db');

async function run() {
    try {
        await db.raw(`
        CREATE TABLE IF NOT EXISTS espiritualidad (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            titulo VARCHAR(255) NOT NULL,
            contenido TEXT NOT NULL,
            tipo VARCHAR(50) NOT NULL DEFAULT 'oracion',
            categoria VARCHAR(100),
            creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        `);
        console.log('Espiritualidad table created');
    } catch (e) {
        console.error(e);
    }
    process.exit();
}

run();
