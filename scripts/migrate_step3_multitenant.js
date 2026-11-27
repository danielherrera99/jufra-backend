const db = require('../db');

async function migrateStep3() {
    try {
        console.log('🚀 Iniciando Paso 3: Migración Multi-Tenant y Alcance Nacional...');

        const pomalca = await db('fraternidades')
            .whereRaw('UPPER(nombre) LIKE ?', ['%POMALCA%'])
            .first();

        if (!pomalca) {
            throw new Error('No se encontró la fraternidad JUFRA POMALCA.');
        }
        console.log(`📍 Fraternidad base: ${pomalca.nombre} (ID: ${pomalca.id})`);

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
            const hasCol = await db.schema.hasColumn(t, 'fraternidad_id');
            if (!hasCol) {
                console.log(`➕ Agregando columna fraternidad_id a "${t}"...`);
                await db.schema.alterTable(t, table => {
                    table.uuid('fraternidad_id')
                        .nullable()
                        .references('id')
                        .inTable('fraternidades')
                        .onDelete('SET NULL');
                });
                console.log(`✅ Columna fraternidad_id agregada a "${t}".`);
            } else {
                console.log(`ℹ️ La columna fraternidad_id ya existía en "${t}".`);
            }

            if (t === 'mensajes') {
                // Para mensajes, intentar heredar fraternidad_id del remitente si existe
                await db.raw(`
                    UPDATE mensajes m
                    SET fraternidad_id = u.fraternidad_id
                    FROM usuarios u
                    WHERE m.remitente_id = u.id
                      AND m.fraternidad_id IS NULL
                      AND u.fraternidad_id IS NOT NULL
                `);
            }

            const updated = await db(t)
                .whereNull('fraternidad_id')
                .update({ fraternidad_id: pomalca.id });
            console.log(`📦 ${updated} registros en "${t}" asignados a JUFRA POMALCA.`);
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
            const hasCol = await db.schema.hasColumn(t, 'es_nacional');
            if (!hasCol) {
                console.log(`➕ Agregando columna es_nacional a "${t}"...`);
                await db.schema.alterTable(t, table => {
                    table.boolean('es_nacional').notNullable().defaultTo(false);
                });
                console.log(`✅ Columna es_nacional agregada a "${t}".`);
            } else {
                console.log(`ℹ️ La columna es_nacional ya existía en "${t}".`);
            }
        }

        console.log('\n🎉 ¡Paso 3 de Base de Datos completado con éxito!');
    } catch (e) {
        console.error('❌ Error en Paso 3:', e);
    } finally {
        await db.destroy();
        process.exit();
    }
}

migrateStep3();
