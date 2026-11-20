const db = require('../db');

async function migrateStep2() {
    try {
        console.log('🚀 Iniciando Paso 2: Migración Multi-Tenant para Asistencias, Finanzas, Actas, Eventos y Anuncios...');

        const pomalca = await db('fraternidades')
            .whereRaw('UPPER(nombre) LIKE ?', ['%POMALCA%'])
            .first();

        if (!pomalca) {
            throw new Error('No se encontró la fraternidad JUFRA POMALCA.');
        }
        console.log(`📍 Fraternidad base: ${pomalca.nombre} (ID: ${pomalca.id})`);

        const tables = ['asistencias', 'finanzas', 'actas', 'eventos', 'anuncios'];

        for (const t of tables) {
            const hasCol = await db.schema.hasColumn(t, 'fraternidad_id');
            if (!hasCol) {
                console.log(`➕ Agregando columna fraternidad_id a la tabla "${t}"...`);
                await db.schema.alterTable(t, table => {
                    table.uuid('fraternidad_id')
                        .nullable()
                        .references('id')
                        .inTable('fraternidades')
                        .onDelete('SET NULL');
                });
                console.log(`✅ Columna agregada a "${t}".`);
            } else {
                console.log(`ℹ️ La columna fraternidad_id ya existía en "${t}".`);
            }

            // Asignar todas las filas existentes a Pomalca
            const updated = await db(t)
                .whereNull('fraternidad_id')
                .update({ fraternidad_id: pomalca.id });
            console.log(`📦 ${updated} registros en "${t}" asignados a JUFRA POMALCA.`);
        }

        console.log('\n🎉 ¡Paso 2 de Base de Datos completado con éxito!');
    } catch (e) {
        console.error('❌ Error en Paso 2:', e);
    } finally {
        await db.destroy();
        process.exit();
    }
}

migrateStep2();
