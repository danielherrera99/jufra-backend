const db = require('./db');

async function up() {
  try {
    const exists = await db.schema.hasTable('quienes_somos');
    if (!exists) {
      await db.schema.createTable('quienes_somos', (table) => {
        table.increments('id').primary();
        table.string('nombre').notNullable();
        table.string('rol').notNullable();
        table.string('categoria').notNullable();
        table.text('foto_url');
        table.integer('orden').defaultTo(0);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Tabla quienes_somos creada exitosamente.');

      // Inserción de datos de prueba
      await db('quienes_somos').insert([
        {
          nombre: 'Fray Ejemplo',
          rol: 'Ministro',
          categoria: 'Consejo Local',
          orden: 1
        },
        {
          nombre: 'Hermano Test',
          rol: 'Viceministro',
          categoria: 'Consejo Local',
          orden: 2
        },
        {
          nombre: 'Hermana Jufra',
          rol: 'Iniciada',
          categoria: 'Hermanos',
          orden: 1
        }
      ]);
      console.log('Datos de prueba insertados exitosamente.');
    } else {
      console.log('La tabla quienes_somos ya existe.');
    }
  } catch (error) {
    console.error('Error creando tabla:', error);
  } finally {
    process.exit(0);
  }
}

up();
