const db = require('./db');

async function checkSchema() {
    try {
        const result = await db.raw("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'actas'");
        console.log('Columns in actas:', result.rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

checkSchema();
