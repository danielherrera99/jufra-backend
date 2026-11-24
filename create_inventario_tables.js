const db = require('./db');

async function createTables() {
    try {
        console.log('Creando tablas de inventario en PostgreSQL...');

        await db.raw(`
            CREATE TABLE IF NOT EXISTS inventario (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                fraternidad_id UUID,
                nombre VARCHAR(150) NOT NULL,
                categoria VARCHAR(50) NOT NULL DEFAULT 'otros',
                codigo VARCHAR(50),
                descripcion TEXT,
                estado VARCHAR(30) NOT NULL DEFAULT 'disponible',
                ubicacion VARCHAR(150),
                foto_url TEXT,
                creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_inventario_fraternidad ON inventario(fraternidad_id);
            CREATE INDEX IF NOT EXISTS idx_inventario_categoria ON inventario(categoria);
            CREATE INDEX IF NOT EXISTS idx_inventario_estado ON inventario(estado);

            CREATE TABLE IF NOT EXISTS prestamos_inventario (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                fraternidad_id UUID,
                articulo_id UUID NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
                usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
                nombre_persona VARCHAR(150),
                telefono_contacto VARCHAR(50),
                fecha_prestamo TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                fecha_devolucion_esperada DATE,
                fecha_devolucion_real TIMESTAMPTZ,
                estado VARCHAR(30) NOT NULL DEFAULT 'activo',
                observaciones_prestamo TEXT,
                observaciones_devolucion TEXT,
                registrado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_prestamos_articulo ON prestamos_inventario(articulo_id);
            CREATE INDEX IF NOT EXISTS idx_prestamos_usuario ON prestamos_inventario(usuario_id);
            CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos_inventario(estado);
        `);

        console.log('✅ Tablas "inventario" y "prestamos_inventario" creadas exitosamente.');
    } catch (err) {
        console.error('❌ Error creando tablas:', err);
    } finally {
        await db.destroy();
        process.exit(0);
    }
}

createTables();
