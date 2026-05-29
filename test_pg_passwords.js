const { Client } = require('pg');

const projectRef = 'utckiuoprtcoexdkmfyj';
const host = 'aws-1-us-west-2.pooler.supabase.com';
const dbName = 'postgres';

const passwords = [
    'Tramun2015@',
    'tramun2015@',
    'Tramun2015@.',
    'tramun2015@.',
    'tramun15',
    'Tramun15',
    'Tramun15@',
    'tramun15@',
    '201599',
    'jufra2025app'
];

async function testPassword(pwd) {
    // Codificar contraseña
    const encodedPwd = encodeURIComponent(pwd);
    const connStr = `postgresql://postgres.${projectRef}:${encodedPwd}@${host}:5432/${dbName}`;
    
    const client = new Client({
        connectionString: connStr,
        connectionTimeoutMillis: 5000,
    });
    
    try {
        await client.connect();
        await client.end();
        return true;
    } catch (err) {
        console.log(`❌ Contraseña "${pwd}" falló: ${err.message}`);
        return false;
    }
}

async function start() {
    console.log('🔍 Probando variaciones de contraseña para Supabase...');
    for (const pwd of passwords) {
        const success = await testPassword(pwd);
        if (success) {
            console.log(`\n🎉 ¡CONEXIÓN EXITOSA! La contraseña correcta es: "${pwd}"`);
            console.log(`URI codificada: postgresql://postgres.${projectRef}:${encodeURIComponent(pwd)}@${host}:5432/${dbName}`);
            process.exit(0);
        }
    }
    console.log('\n❌ Ninguna contraseña funcionó. Por favor verifica en el dashboard o recrea el password en Database Settings > Database Password.');
    process.exit(1);
}

start();
