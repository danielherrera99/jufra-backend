const db = require('./db');

async function run() {
    try {
        await db.raw(`
        CREATE TABLE IF NOT EXISTS anuncios (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            titulo VARCHAR(255) NOT NULL,
            contenido TEXT NOT NULL,
            tipo VARCHAR(50) NOT NULL DEFAULT 'general',
            prioridad VARCHAR(20) NOT NULL DEFAULT 'normal',
            destacado BOOLEAN NOT NULL DEFAULT FALSE,
            destinatarios VARCHAR(50) NOT NULL DEFAULT 'todos',
            autor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
            fecha_publicacion TIMESTAMPTZ DEFAULT NOW(),
            fecha_expiracion TIMESTAMPTZ,
            vistas INT DEFAULT 0,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        `);
        console.log('Anuncios table created');
    } catch (e) {
        console.error(e);
    }
    process.exit();
}

run();
