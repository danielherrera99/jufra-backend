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
        } catch (err) {
            console.error('⚠️ Error en ensureMultiTenantSchema:', err.message);
            schemaPromise = null;
        }
    })();

    return schemaPromise;
}

module.exports = ensureMultiTenantSchema;
