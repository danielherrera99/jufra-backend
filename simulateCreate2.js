const mongoose = require('mongoose');
const connectDB = async () => {
    await mongoose.connect('mongodb+srv://admin_jufra:jufra2025app@clusterjufra.lsslyqn.mongodb.net/jufra-db?appName=ClusterJufra');
    const Anuncio = require('./models/Anuncio');
    try {
        const anuncioData = {
            titulo: "Test POST",
            contenido: "Contenido 123",
            tipo: "urgente",
            prioridad: "normal",
            destinatarios: "todos",
            autor: new mongoose.Types.ObjectId()
        };
        const anuncio = await Anuncio.create(anuncioData);
        console.log("Success:", anuncio);
    } catch(e) {
        console.log("Creation Error:", e);
    }
    process.exit(0);
};
connectDB();
