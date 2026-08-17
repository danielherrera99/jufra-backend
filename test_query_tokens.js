const db = require('./db');
const Usuario = require('./models/Usuario');
Usuario.find({ activo: true, expoPushToken: { $ne: null } })
  .then(res => {
    console.log('Found:', res.map(u => u.expoPushToken));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
