const db = require('./db');

async function up() {
    try {
        const exists = await db.schema.hasTable('galeria_web');
        if (!exists) {
            await db.schema.createTable('galeria_web', (table) => {
                table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
                table.string('titulo').notNullable();
                table.text('descripcion').nullable();
                table.string('categoria').defaultTo('todas');
                table.string('archivo_url').notNullable();
                table.timestamp('fecha').defaultTo(db.fn.now());
                table.timestamp('created_at').defaultTo(db.fn.now());
                table.timestamp('updated_at').defaultTo(db.fn.now());
            });
            console.log('✅ Tabla galeria_web creada correctamente.');
        } else {
            console.log('⚠️ La tabla galeria_web ya existe.');
        }
    } catch (error) {
        console.error('❌ Error al crear la tabla galeria_web:', error);
    } finally {
        process.exit();
    }
}

up();
