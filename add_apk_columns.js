require('dotenv').config();
const db = require('./db');

async function migrate() {
  try {
    const table = 'web_config';
    console.log(`Checking app apk columns on ${table}...`);
    
    const hasApkUrl = await db.schema.hasColumn(table, 'app_apk_url');
    if (!hasApkUrl) {
      await db.schema.alterTable(table, t => {
        t.text('app_apk_url').defaultTo('');
        t.string('app_version', 50).defaultTo('v1.0.0');
      });
      console.log('Columns app_apk_url and app_version added successfully.');
    } else {
      console.log('Columns already exist.');
    }
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await db.destroy();
  }
}

migrate();
