const db = require('./db');
async function check() {
  const res = await db.raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'eventos'");
  console.log('Columnas:', res.rows.map(r => r.column_name).join(', '));
  process.exit(0);
}
check();
