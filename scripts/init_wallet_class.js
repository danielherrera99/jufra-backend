const { google } = require('googleapis');
require('dotenv').config();

async function initWalletClass() {
    try {
        let pk = process.env.GOOGLE_WALLET_PRIVATE_KEY || '';
        if (pk.startsWith('"') && pk.endsWith('"')) pk = pk.slice(1, -1);
        pk = pk.replace(/\\n/g, '\n');

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_WALLET_CLIENT_EMAIL,
                private_key: pk
            },
            scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
        });

        const client = await auth.getClient();
        const wallet = google.walletobjects({ version: 'v1', auth: client });
        const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
        const classId = `${issuerId}.jufra_carnet_oficial_v1`;

        console.log('Verificando clase:', classId);
        try {
            const res = await wallet.genericclass.get({ resourceId: classId });
            console.log('✅ Clase ya existe en Google Wallet:', res.data.id);
        } catch (e) {
            console.log('⚠️ Clase no encontrada, creándola en Google Wallet...');
            try {
                const ins = await wallet.genericclass.insert({
                    requestBody: {
                        id: classId
                    }
                });
                console.log('✅ Clase creada exitosamente:', ins.data.id);
            } catch (err2) {
                console.error('❌ Error al crear clase:', JSON.stringify(err2.response?.data || err2.message, null, 2));
            }
        }
    } catch (err) {
        console.error('❌ Error de autenticación:', err.message);
    }
}

initWalletClass();
