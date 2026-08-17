const db = require('./db');

async function modifyActas() {
    try {
        console.log('Adding asistentes and acuerdos JSONB columns to actas table...');
        await db.schema.alterTable('actas', table => {
            table.jsonb('asistentes').defaultTo('[]');
            table.jsonb('acuerdos').defaultTo('[]');
        });
        console.log('Columns added successfully.');
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log('Columns already exist.');
        } else {
            console.error('Error adding columns:', e);
        }
    }
    process.exit(0);
}

modifyActas();
