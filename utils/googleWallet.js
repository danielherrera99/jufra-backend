const jwt = require('jsonwebtoken');

/**
 * Generador de Pases de Google Wallet para JUFRA
 * Soporta GenericClass y GenericObject con código QR, geofencing y notificaciones push.
 */

// Coordenadas aproximadas por defecto para fraternidades conocidas (para geofencing)
const COORDENADAS_SEDES = {
    pomalca: { lat: -6.7705, lng: -79.7745, label: 'Parroquia San Martín de Porres - Pomalca' },
    piura: { lat: -5.1945, lng: -80.6328, label: 'Sede JUFRA Piura' },
    cusco: { lat: -13.5167, lng: -71.9789, label: 'Sede JUFRA Cusco' },
    trujillo: { lat: -8.1118, lng: -79.0287, label: 'Sede JUFRA Trujillo' },
    lima: { lat: -12.0464, lng: -77.0428, label: 'Convento San Francisco - Lima' }
};

function resolveCoordenadas(fraternidad) {
    if (fraternidad?.latitud && fraternidad?.longitud) {
        return {
            lat: parseFloat(fraternidad.latitud),
            lng: parseFloat(fraternidad.longitud),
            label: fraternidad.parroquia || fraternidad.nombre
        };
    }
    const nombre = (fraternidad?.nombre || '').toLowerCase();
    for (const [key, coords] of Object.entries(COORDENADAS_SEDES)) {
        if (nombre.includes(key)) return coords;
    }
    // Default Pomalca / Perú
    return COORDENADAS_SEDES.pomalca;
}

/**
 * Genera el GenericObject y GenericClass para el carnet digital de un hermano JUFRA.
 */
function buildPassPayload({ usuario, fraternidad, issuerId }) {
    const classId = `${issuerId}.jufra_carnet_oficial_v1`;
    const objectId = `${issuerId}.jufra_pass_${usuario.id || usuario._id}`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const sedeCoords = resolveCoordenadas(fraternidad);

    const genericClass = {
        id: classId,
        reviewStatus: 'UNDER_REVIEW'
    };

    const qrData = JSON.stringify({
        id: usuario.id || usuario._id,
        nombre: usuario.nombreCompleto || `${usuario.nombre} ${usuario.apellido}`,
        username: usuario.username
    });

    const genericObject = {
        id: objectId,
        classId: classId,
        logo: {
            sourceUri: {
                uri: 'https://jufrapomalca.vercel.app/tau.png'
            },
            contentDescription: {
                defaultValue: {
                    language: 'es-419',
                    value: 'TAU Franciscana - JUFRA'
                }
            }
        },
        cardTitle: {
            defaultValue: {
                language: 'es-419',
                value: 'JUVENTUD FRANCISCANA'
            }
        },
        subheader: {
            defaultValue: {
                language: 'es-419',
                value: fraternidad?.nombre || 'JUFRA Pomalca'
            }
        },
        header: {
            defaultValue: {
                language: 'es-419',
                value: `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim()
            }
        },
        hexBackgroundColor: '#451a03', // Franciscano TAU marrón profundo
        barcode: {
            type: 'QR_CODE',
            value: qrData,
            alternateText: usuario.username || 'JUFRA PERÚ'
        },
        textModulesData: [
            {
                id: 'cargo',
                header: 'CARGO',
                body: usuario.cargo && usuario.cargo !== 'ninguno' ? usuario.cargo.toUpperCase().replace('_', ' ') : 'HERMANO DE BASE'
            },
            {
                id: 'etapa',
                header: 'ETAPA FORMATIVA',
                body: usuario.etapaFormacion ? usuario.etapaFormacion.toUpperCase().replace('_', ' ') : 'JUFRA'
            },
            {
                id: 'parroquia',
                header: 'PARROQUIA / TEMPLO',
                body: fraternidad?.parroquia || fraternidad?.direccion || 'Parroquia San Martín de Porres'
            },
            {
                id: 'reunion',
                header: 'HORARIO REUNIÓN',
                body: fraternidad?.horarioReunion || fraternidad?.horario_reunion || 'Sábados'
            }
        ],
        linksModuleData: {
            uris: [
                {
                    uri: 'https://jufrapomalca.vercel.app',
                    description: 'Portal Web Oficial JUFRA'
                }
            ]
        },
        messages: [
            {
                header: 'Paz y Bien',
                body: 'Bienvenido(a) a tu carnet digital oficial de la Juventud Franciscana del Perú. ¡Que el Señor te bendiga y te guarde!',
                id: 'bienvenida_jufra'
            }
        ],
        locations: [
            {
                latitude: sedeCoords.lat,
                longitude: sedeCoords.lng
            }
        ]
    };

    return { genericClass, genericObject };
}

/**
 * Obtiene la URL oficial para guardar el carnet en Google Wallet
 */
function generateGoogleWalletSaveUrl({ usuario, fraternidad }) {
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    const clientEmail = process.env.GOOGLE_WALLET_CLIENT_EMAIL;
    let privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY;

    // Si no están configuradas las credenciales en producción/local
    if (!issuerId || !clientEmail || !privateKey) {
        return {
            isConfigured: false,
            message: 'Credenciales de Google Wallet no configuradas aún en el servidor.',
            passPreview: {
                titulo: 'JUVENTUD FRANCISCANA DEL PERÚ',
                nombre: `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim(),
                fraternidad: fraternidad?.nombre || 'JUFRA Pomalca',
                cargo: usuario.cargo || 'Hermano(a)',
                etapa: usuario.etapaFormacion || 'JUFRA',
                sede: fraternidad?.parroquia || 'Parroquia San Martín de Porres',
                color: '#451a03',
                qrData: JSON.stringify({
                    id: usuario.id || usuario._id,
                    nombre: `${usuario.nombre} ${usuario.apellido}`,
                    username: usuario.username
                })
            }
        };
    }

    try {
        // Normalizar clave privada (reemplazar \\n por saltos de línea reales)
        if (privateKey.includes('\\n')) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }

        const { genericClass, genericObject } = buildPassPayload({ usuario, fraternidad, issuerId });

        const claims = {
            iss: clientEmail,
            aud: 'google',
            origins: [
                'https://jufrapomalca.vercel.app',
                'http://localhost:5173',
                'http://localhost:3000'
            ],
            typ: 'savetowallet',
            payload: {
                genericClasses: [genericClass],
                genericObjects: [genericObject]
            }
        };

        const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        return {
            isConfigured: true,
            saveUrl,
            token
        };
    } catch (err) {
        console.error('⚠️ Error al firmar JWT de Google Wallet:', err.message);
        return {
            isConfigured: false,
            error: err.message,
            passPreview: {
                titulo: 'JUVENTUD FRANCISCANA DEL PERÚ',
                nombre: `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim(),
                fraternidad: fraternidad?.nombre || 'JUFRA Pomalca',
                cargo: usuario.cargo || 'Hermano(a)',
                etapa: usuario.etapaFormacion || 'JUFRA'
            }
        };
    }
}

module.exports = {
    generateGoogleWalletSaveUrl,
    buildPassPayload
};
