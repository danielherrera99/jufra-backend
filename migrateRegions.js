const mongoose = require('mongoose');
require('dotenv').config();
const Fraternidad = require('./models/Fraternidad');

// Mapeo oficial de departamentos normalized (sin tildes, minúsculas) a la nueva zona
const deptoToRegion = {
  // norte
  'amazonas': 'norte',
  'ancash': 'norte',
  'cajamarca': 'norte',
  'la libertad': 'norte',
  'lambayeque': 'norte',
  'piura': 'norte',
  'tumbes': 'norte',
  'san martin': 'norte',
  'loreto': 'norte',
  
  // centro
  'junin': 'centro',
  'pasco': 'centro',
  'huanuco': 'centro',
  'ayacucho': 'centro',
  'huancavelica': 'centro',
  'ucayali': 'centro',
  
  // lima_callao_sur_medio
  'lima': 'lima_callao_sur_medio',
  'callao': 'lima_callao_sur_medio',
  'ica': 'lima_callao_sur_medio',
  
  // sur_altiplano
  'puno': 'sur_altiplano',
  'cusco': 'sur_altiplano',
  'arequipa': 'sur_altiplano',
  'apurimac': 'sur_altiplano',
  'moquegua': 'sur_altiplano',
  'tacna': 'sur_altiplano',
  'madre de dios': 'sur_altiplano'
};

const normalize = (str) => {
  if (!str) return '';
  return str.toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .trim();
};

async function run() {
    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI no está definido en el archivo .env');
        process.exit(1);
    }

    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado con éxito');

        const fraternidades = await Fraternidad.find({});
        console.log(`📋 Total fraternidades encontradas en la base de datos: ${fraternidades.length}`);

        let updatedCount = 0;
        for (const f of fraternidades) {
            const normDepto = normalize(f.departamento);
            const expectedRegion = deptoToRegion[normDepto];

            if (expectedRegion) {
                if (f.zona !== expectedRegion) {
                    console.log(`🔄 Migrando "${f.nombre}" (${f.departamento}): "${f.zona}" ➡️ "${expectedRegion}"`);
                    f.zona = expectedRegion;
                    await f.save();
                    updatedCount++;
                } else {
                    console.log(`✅ "${f.nombre}" ya está correctamente asignado a la Región "${expectedRegion}"`);
                }
            } else {
                console.log(`⚠️ Departamento no reconocido para la fraternidad "${f.nombre}": "${f.departamento}"`);
            }
        }

        console.log(`\n🎉 Migración finalizada con éxito. ${updatedCount} fraternidades actualizadas.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en el proceso de migración:', error);
        process.exit(1);
    }
}

run();
