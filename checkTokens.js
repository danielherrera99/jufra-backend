const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Cargar env desde el backend
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkTokens() {
    try {
        console.log('📡 Conectando a MongoDB para verificar Tokens...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        const Usuario = require('./models/Usuario');
        const usuariosConToken = await Usuario.find({ 
            expoPushToken: { $exists: true, $ne: null, $ne: '' } 
        }, 'nombre username expoPushToken');

        console.log('\n--- 📱 ESTADO DE TOKENS REGISTRADOS ---');
        if (usuariosConToken.length === 0) {
            console.log('❌ NO HAY TOKENS EN LA BASE DE DATOS.');
            console.log('💡 CAUSA: Ningún usuario ha iniciado sesión con la NUEVA App todavía.');
        } else {
            console.log(`✅ SE ENCONTRARON ${usuariosConToken.length} TOKENS:`);
            usuariosConToken.forEach(u => {
                console.log(`- ${u.nombre} (@${u.username}): ${u.expoPushToken.substring(0, 20)}...`);
            });
        }
        console.log('--------------------------------------\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error en el check:', error);
        process.exit(1);
    }
}

checkTokens();
