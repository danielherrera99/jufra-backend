const mongoose = require('mongoose');
const Anuncio = require('./models/Anuncio');
require('dotenv').config();

mongoose.connect('mongodb+srv://herreraestacion:e7lIqN7r4b1s3vD5@cluster0.z5l3o.mongodb.net/jufra?retryWrites=true&w=majority&appName=Cluster0')
.then(async () => {
    try {
        const anuncioData = {
            titulo: "Test API Error",
            contenido: "UHUIHUIHUI",
            tipo: "urgente",
            prioridad: "normal",
            destinatarios: "todos",
            autor: "6747dffb2626e3cda2ecf5ca" // Mock ObjectId (Admin?)
        };
        const anuncio = await Anuncio.create(anuncioData);
        console.log("SUCCESS:", anuncio);
    } catch (error) {
        console.log("ERROR THROWN BY MONGOOSE:", error);
    }
    mongoose.connection.close();
})
.catch(err => console.error(err));
