const db = require('./db');

async function createTable() {
    try {
        await db.raw(`
            CREATE TABLE IF NOT EXISTS campaigns (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                titulo TEXT,
                descripcion TEXT,
                fecha_hora TEXT,
                ubicacion TEXT,
                map_query TEXT,
                cronograma JSONB DEFAULT '[]'::jsonb,
                reglas JSONB DEFAULT '[]'::jsonb,
                is_active BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabla campaigns creada exitosamente.');
    } catch (err) {
        console.error('Error creando tabla:', err);
    } finally {
        process.exit(0);
    }
}

createTable();
