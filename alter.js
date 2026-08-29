const db = require('./db');

async function alterTables() {
    try {
        const hasMostrarRedes = await db.schema.hasColumn('redes_sociales', 'mostrar_en_todos');
        if (!hasMostrarRedes) {
            await db.schema.alterTable('redes_sociales', table => {
                table.boolean('mostrar_en_todos').defaultTo(false);
            });
            console.log('Agregada columna mostrar_en_todos a redes_sociales');
        } else {
            console.log('La columna mostrar_en_todos ya existe en redes_sociales');
        }

        const hasMostrarPubs = await db.schema.hasColumn('publicaciones_sociales', 'mostrar_en_todos');
        if (!hasMostrarPubs) {
            await db.schema.alterTable('publicaciones_sociales', table => {
                table.boolean('mostrar_en_todos').defaultTo(false);
            });
            console.log('Agregada columna mostrar_en_todos a publicaciones_sociales');
        } else {
            console.log('La columna mostrar_en_todos ya existe en publicaciones_sociales');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

alterTables();
