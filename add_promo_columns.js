require('dotenv').config();
const db = require('./db');

async function migrate() {
  try {
    const table = 'web_config';
    console.log(`Adding promo columns to ${table}...`);
    
    const hasPromoActiva = await db.schema.hasColumn(table, 'promo_activa');
    if (!hasPromoActiva) {
      await db.schema.alterTable(table, t => {
        t.boolean('promo_activa').defaultTo(false);
        t.text('promo_titulo').defaultTo('¡Próxima Actividad!');
        t.text('promo_descripcion').defaultTo('Te invitamos a participar en nuestro próximo evento.');
        t.text('promo_imagen_url').defaultTo('');
        t.text('promo_boton_texto').defaultTo('Saber más');
        t.text('promo_boton_link').defaultTo('#eventos');
      });
      console.log('Columns added successfully.');
    } else {
      console.log('Columns already exist.');
    }
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    db.destroy();
  }
}

migrate();
