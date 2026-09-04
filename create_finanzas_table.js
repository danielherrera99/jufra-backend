const db = require('./db');

async function createFinanzasTable() {
    try {
        const query = `
        CREATE TABLE IF NOT EXISTS finanzas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tipo VARCHAR(10) NOT NULL,
            monto NUMERIC(10, 2) NOT NULL,
            fecha DATE NOT NULL DEFAULT CURRENT_DATE,
            descripcion TEXT NOT NULL,
            categoria VARCHAR(50) NOT NULL DEFAULT 'otros',
            comprobante_url TEXT,
            registrado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            
            CONSTRAINT check_tipo_finanza CHECK (tipo IN ('ingreso', 'egreso')),
            CONSTRAINT check_categoria_finanza CHECK (categoria IN ('diezmo', 'donacion', 'actividad', 'compras', 'servicios', 'otros'))
        );

        CREATE INDEX IF NOT EXISTS idx_finanzas_fecha ON finanzas(fecha);
        CREATE INDEX IF NOT EXISTS idx_finanzas_tipo ON finanzas(tipo);
        `;
        
        await db.raw(query);
        console.log('✅ Tabla finanzas creada con éxito (si no existía)');
    } catch (e) {
        console.error('❌ Error creando tabla finanzas:', e);
    } finally {
        process.exit(0);
    }
}

createFinanzasTable();
