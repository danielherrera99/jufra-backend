const db = require('../db');

async function createTable() {
    try {
        const exists = await db.schema.hasTable('campaigns');
        if (!exists) {
            await db.schema.createTable('campaigns', table => {
                table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
                table.string('titulo').notNullable();
                table.text('descripcion');
                table.string('fecha_hora').notNullable();
                table.string('ubicacion');
                table.string('map_query');
                table.jsonb('cronograma').defaultTo('[]');
                table.jsonb('reglas').defaultTo('[]');
                table.boolean('is_active').defaultTo(false);
                table.timestamp('created_at').defaultTo(db.fn.now());
                table.timestamp('updated_at').defaultTo(db.fn.now());
            });
            console.log('✅ Tabla "campaigns" creada exitosamente.');
        } else {
            console.log('⚠️ La tabla "campaigns" ya existe.');
        }
    } catch (error) {
        console.error('❌ Error creando tabla:', error);
    } finally {
        process.exit();
    }
}

createTable();
