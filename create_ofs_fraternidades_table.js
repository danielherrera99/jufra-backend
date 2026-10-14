const db = require('./db');

async function up() {
    try {
        const exists = await db.schema.hasTable('ofs_fraternidades');
        if (!exists) {
            await db.schema.createTable('ofs_fraternidades', (table) => {
                table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
                table.string('nombre', 255).notNullable();
                table.string('patrono', 255).defaultTo('');
                table.string('sede', 255).defaultTo('');
                table.string('departamento', 100).notNullable().defaultTo('Lambayeque');
                table.string('ciudad', 100).defaultTo('Chiclayo');
                table.string('zona', 50).notNullable().defaultTo('norte');
                table.text('horarios').defaultTo('');
                table.string('contacto', 255).defaultTo('');
                table.string('telefono', 50).defaultTo('');
                table.text('enlace_web').defaultTo('');
                table.text('enlace_social').defaultTo('');
                table.text('imagen_url').defaultTo('');
                table.boolean('activo').defaultTo(true);
                table.timestamp('created_at').defaultTo(db.fn.now());
                table.timestamp('updated_at').defaultTo(db.fn.now());
            });
            console.log('✅ Tabla ofs_fraternidades creada correctamente.');

            // Insertar fraternidad de Chiclayo inicial
            await db('ofs_fraternidades').insert({
                nombre: 'Fraternidad OFS Chiclayo',
                patrono: 'Santa Isabel de Hungría',
                sede: 'Convento San Antonio de Padua',
                departamento: 'Lambayeque',
                ciudad: 'Chiclayo',
                zona: 'norte',
                horarios: '1er y 3er sábado de cada mes - 4:30 PM (Reunión formativa y oración)',
                contacto: 'Consejo Fraternidad OFS',
                telefono: '+51 979 948 528',
                enlace_web: '/ofs/chiclayo',
                enlace_social: '',
                activo: true
            });
            console.log('✅ Fraternidad OFS Chiclayo sembrada correctamente.');
        } else {
            console.log('⚠️ La tabla ofs_fraternidades ya existe.');
        }
    } catch (error) {
        console.error('❌ Error al crear la tabla ofs_fraternidades:', error);
    } finally {
        process.exit();
    }
}

up();
