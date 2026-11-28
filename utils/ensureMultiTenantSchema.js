const db = require('../db');

let schemaPromise = null;

async function ensureMultiTenantSchema() {
    if (schemaPromise) return schemaPromise;

    schemaPromise = (async () => {
        try {
            const pomalca = await db('fraternidades')
                .whereRaw('UPPER(nombre) LIKE ?', ['%POMALCA%'])
                .first();

            const pomalcaId = pomalca ? pomalca.id : null;

            const tablesWithFraternidad = [
                'peticiones',
                'espiritualidad',
                'cantos',
                'servicios',
                'formaciones',
                'documentos',
                'galeria',
                'mensajes'
            ];

            for (const t of tablesWithFraternidad) {
                await db.raw(`
                    ALTER TABLE ${t}
                    ADD COLUMN IF NOT EXISTS fraternidad_id UUID REFERENCES fraternidades(id) ON DELETE SET NULL
                `);

                if (t === 'mensajes') {
                    await db.raw(`
                        UPDATE mensajes m
                        SET fraternidad_id = u.fraternidad_id
                        FROM usuarios u
                        WHERE m.remitente_id = u.id
                          AND m.fraternidad_id IS NULL
                          AND u.fraternidad_id IS NOT NULL
                    `);
                }

                if (pomalcaId) {
                    await db(t).whereNull('fraternidad_id').update({ fraternidad_id: pomalcaId });
                }
            }

            const tablesWithNacional = [
                'peticiones',
                'espiritualidad',
                'cantos',
                'servicios',
                'formaciones',
                'documentos',
                'galeria',
                'anuncios',
                'eventos'
            ];

            for (const t of tablesWithNacional) {
                await db.raw(`
                    ALTER TABLE ${t}
                    ADD COLUMN IF NOT EXISTS es_nacional BOOLEAN NOT NULL DEFAULT false
                `);
            }

            // Columnas enriquecidas para el portal público de cada fraternidad
            const fratColumns = [
                'ALTER TABLE fraternidades ADD COLUMN IF NOT EXISTS descripcion TEXT',
                'ALTER TABLE fraternidades ADD COLUMN IF NOT EXISTS lema VARCHAR(255)',
                'ALTER TABLE fraternidades ADD COLUMN IF NOT EXISTS direccion VARCHAR(255)',
                'ALTER TABLE fraternidades ADD COLUMN IF NOT EXISTS horario_reunion VARCHAR(255)',
                'ALTER TABLE fraternidades ADD COLUMN IF NOT EXISTS instagram VARCHAR(255)',
                'ALTER TABLE fraternidades ADD COLUMN IF NOT EXISTS facebook VARCHAR(255)',
                'ALTER TABLE fraternidades ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255)',
                'ALTER TABLE fraternidades ADD COLUMN IF NOT EXISTS banner_url TEXT',
                'ALTER TABLE fraternidades ADD COLUMN IF NOT EXISTS logo_url TEXT',
                'ALTER TABLE fraternidades ADD COLUMN IF NOT EXISTS latitud NUMERIC(10, 6)',
                'ALTER TABLE fraternidades ADD COLUMN IF NOT EXISTS longitud NUMERIC(10, 6)'
            ];

            for (const colSql of fratColumns) {
                try {
                    await db.raw(colSql);
                } catch (colErr) {
                    // Columna ya existente o ignorar si ya fue aplicada
                }
            }
        } catch (err) {
            console.error('⚠️ Error en ensureMultiTenantSchema:', err.message);
            schemaPromise = null;
        }
    })();

    return schemaPromise;
}

module.exports = ensureMultiTenantSchema;
