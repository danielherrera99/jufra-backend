const mongoose = require('mongoose');
const Usuario = require('./models/Usuario');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://herreraestacion:e7lIqN7r4b1s3vD5@cluster0.z5l3o.mongodb.net/jufra?retryWrites=true&w=majority&appName=Cluster0')
.then(async () => {
    const users = await Usuario.find({ expoPushToken: { $ne: null } });
    console.log('Users with push token:', users.length);
    users.forEach(u => console.log(u.username, u.expoPushToken));
    mongoose.connection.close();
})
.catch(err => console.error(err));
