const db = require('./db');
async function run() {
  try {
    await db.raw(`
      CREATE TABLE IF NOT EXISTS redes_sociales (
        id SERIAL PRIMARY KEY,
        red_social VARCHAR(50) NOT NULL,
        author_name VARCHAR(100),
        author_icon TEXT,
        date_text VARCHAR(100),
        content TEXT,
        image_url TEXT,
        likes VARCHAR(50),
        comments VARCHAR(50),
        link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tabla redes_sociales creada exitosamente.');
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
