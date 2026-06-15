const db = require('./db');
const Espiritualidad = require('./models/Espiritualidad');

async function test() {
    try {
        const u = await db('usuarios').first();
        if (!u) {
            console.log("No usuarios");
            return;
        }

        console.log("Creando espiritualidad...");
        const newItem = await Espiritualidad.create({
            titulo: 'Test',
            contenido: 'Test contenido',
            tipo: 'oracion',
            categoria: 'Test cat',
            creadoPor: u.id
        });
        console.log("Exito:", newItem);
    } catch (e) {
        console.error("SQL Error:", e.message);
    }
    process.exit();
}

test();
