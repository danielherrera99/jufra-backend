const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testObjectAndJwt() {
    try {
        let pk = process.env.GOOGLE_WALLET_PRIVATE_KEY || '';
        if (pk.startsWith('"') && pk.endsWith('"')) pk = pk.slice(1, -1);
        pk = pk.replace(/\\n/g, '\n');

        const clientEmail = process.env.GOOGLE_WALLET_CLIENT_EMAIL;
        const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
        const classId = `${issuerId}.jufra_carnet_oficial_v1`;
        const objectId = `${issuerId}.jufra_pass_test_${Date.now()}`;

        const genericObject = {
            id: objectId,
            classId: classId,
            state: 'ACTIVE',
            cardTitle: {
                defaultValue: {
                    language: 'es-419',
                    value: 'JUVENTUD FRANCISCANA'
                }
            },
            subheader: {
                defaultValue: {
                    language: 'es-419',
                    value: 'JUFRA Pomalca'
                }
            },
            header: {
                defaultValue: {
                    language: 'es-419',
                    value: 'Daniel Herrera'
                }
            },
            hexBackgroundColor: '#451a03',
            barcode: {
                type: 'QR_CODE',
                value: 'TEST_JUFRA_HERMANO_1',
                alternateText: 'JUFRA PERU'
            },
            textModulesData: [
                {
                    id: 'cargo',
                    header: 'CARGO',
                    body: 'ANIMADOR'
                },
                {
                    id: 'etapa',
                    header: 'ETAPA FORMATIVA',
                    body: 'PROMESA'
                }
            ]
        };

        const claims = {
            iss: clientEmail,
            aud: 'google',
            typ: 'savetowallet',
            iat: Math.floor(Date.now() / 1000),
            payload: {
                genericObjects: [genericObject]
            }
        };

        const token = jwt.sign(claims, pk, { algorithm: 'RS256' });
        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;
        console.log('--- URL GENERADA ---');
        console.log(saveUrl);

    } catch (err) {
        console.error('Error:', err);
    }
}

testObjectAndJwt();
