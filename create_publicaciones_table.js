const db = require('./db');
require('dotenv').config();

async function createTable() {
    try {
        const exists = await db.schema.hasTable('publicaciones_sociales');
        if (!exists) {
            await db.schema.createTable('publicaciones_sociales', (table) => {
                table.increments('id').primary();
                table.string('plataforma').notNullable(); // facebook, instagram, youtube, tiktok
                table.string('post_id').notNullable().unique(); // ID original del post
                table.string('url'); // Link al post
                table.text('titulo'); // Caption o título
                table.timestamp('fecha_publicacion'); // Fecha de creación
                table.integer('vistas').defaultTo(0);
                table.integer('likes').defaultTo(0);
                table.integer('comentarios').defaultTo(0);
                table.string('imagen_url', 1000); // URL de la miniatura
                table.timestamps(true, true); // created_at, updated_at
            });
            console.log('✅ Tabla publicaciones_sociales creada exitosamente.');
        } else {
            console.log('⚠️ La tabla publicaciones_sociales ya existe.');
        }
    } catch (error) {
        console.error('❌ Error creando tabla:', error);
    } finally {
        db.destroy();
    }
}

createTable();
