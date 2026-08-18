const db = require('./db');
const Mensaje = require('./models/Mensaje');

Mensaje.find({ '$or': [{ remitente: '034955c0-2fba-44a4-bc35-562283b84d87' }, { destinatario: '034955c0-2fba-44a4-bc35-562283b84d87' }] })
  .sort({ createdAt: -1 })
  .then(res => {
    console.log('success', res.length);
    process.exit(0);
  })
  .catch(e => {
    console.error('ERROR:', e.stack);
    process.exit(1);
  });
