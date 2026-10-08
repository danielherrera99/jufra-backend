const db = require('./db');

async function createTable() {
    try {
        console.log('✅ Conexión exitosa a Supabase PostgreSQL (vía Knex)');

        const tableExists = await db.schema.hasTable('registros_mascotas');
        if (!tableExists) {
            await db.schema.createTable('registros_mascotas', (table) => {
                table.increments('id').primary(); // ID interno
                table.string('id_solicitud').notNullable().unique(); // ID público visible
                table.string('nombre_dueno').notNullable();
                table.string('nombre_mascota').notNullable();
                table.string('whatsapp').notNullable();
                table.boolean('recibio_bendicion').defaultTo(false);
                table.boolean('recibio_vacuna').defaultTo(false);
                table.boolean('recibio_desparasitacion').defaultTo(false);
                table.boolean('estado_aprobado').defaultTo(false);
                table.timestamps(true, true); // created_at, updated_at
            });
            console.log('✅ Tabla "registros_mascotas" creada exitosamente.');
        } else {
            console.log('⚠️ La tabla "registros_mascotas" ya existe.');
        }

    } catch (error) {
        console.error('❌ Error al crear la tabla:', error);
    } finally {
        process.exit(0);
    }
}

createTable();
