const { google } = require('googleapis');
const path = require('path');
const stream = require('stream');

const FOLDER_ID = '104IEJOkcsC-AbXatZgcDbzwx40pubk-_';

const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback' // redirect_uri no se necesita para API calls con refresh token, pero se pone para no romper la libreria
);

auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth });

/**
 * Obtiene o crea una subcarpeta dentro de FOLDER_ID.
 * @param {String} folderName Nombre de la carpeta
 * @returns {Promise<String>} ID de la carpeta
 */
const getOrCreateFolder = async (folderName) => {
    try {
        if (!folderName) return FOLDER_ID; // Si no se especifica, usa la raíz compartida

        // Buscar si la carpeta ya existe
        const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${FOLDER_ID}' in parents and trashed=false`;
        const res = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (res.data.files && res.data.files.length > 0) {
            // Ya existe, devolver su ID
            return res.data.files[0].id;
        }

        // Si no existe, crearla
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [FOLDER_ID]
        };

        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id'
        });

        return folder.data.id;
    } catch (error) {
        console.error('Error al obtener o crear carpeta:', error);
        // Si falla (por ejemplo, timeout), guardamos en el root como fallback
        return FOLDER_ID; 
    }
};

/**
 * Sube un archivo PDF a Google Drive.
 * @param {Buffer} fileBuffer Buffer del archivo PDF
 * @param {String} fileName Nombre del archivo a crear en Drive
 * @param {String} [folderName] Nombre opcional de la subcarpeta
 * @returns {Promise<String>} Enlace de vista del archivo creado
 */
const uploadPdfToDrive = async (fileBuffer, fileName, folderName = null) => {
    try {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);

        const targetFolderId = await getOrCreateFolder(folderName);

        const fileMetadata = {
            name: fileName,
            parents: [targetFolderId],
        };

        const media = {
            mimeType: 'application/pdf',
            body: bufferStream,
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink'
        });

        const fileId = response.data.id;
        
        // Dar permiso de vista publica o lectura a quien tenga el link por si acaso
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            }
        });

        // Obtener el enlace actualizado
        const result = await drive.files.get({
            fileId: fileId,
            fields: 'webViewLink'
        });

        return result.data.webViewLink;
    } catch (error) {
        console.error('Error al subir a Google Drive:', error);
        throw error;
    }
};

/**
 * Sube un archivo genérico a Google Drive.
 * @param {Buffer} fileBuffer Buffer del archivo
 * @param {String} fileName Nombre del archivo a crear en Drive
 * @param {String} mimeType Tipo MIME del archivo
 * @param {String} [folderName] Nombre opcional de la subcarpeta
 * @returns {Promise<Object>} Enlaces del archivo { webViewLink, webContentLink, directLink }
 */
const uploadFileToDrive = async (fileBuffer, fileName, mimeType, folderName = null) => {
    try {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);

        const targetFolderId = await getOrCreateFolder(folderName);

        const fileMetadata = {
            name: fileName,
            parents: [targetFolderId],
        };

        const media = {
            mimeType: mimeType,
            body: bufferStream,
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink'
        });

        const fileId = response.data.id;
        
        // Dar permiso de vista publica o lectura a quien tenga el link por si acaso
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            }
        });

        // Obtener el enlace actualizado
        const result = await drive.files.get({
            fileId: fileId,
            fields: 'webViewLink, webContentLink'
        });

        return {
            id: fileId,
            webViewLink: result.data.webViewLink,
            webContentLink: result.data.webContentLink,
            directLink: `https://drive.google.com/uc?id=${fileId}`
        };
    } catch (error) {
        console.error('Error al subir a Google Drive:', error);
        throw error;
    }
};


module.exports = {
    uploadPdfToDrive,
    uploadFileToDrive
};
