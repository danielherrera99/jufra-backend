const { google } = require('googleapis');
const path = require('path');

const KEY_FILE_PATH = path.join(__dirname, 'jufra-drive-b66f05f577a8.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: SCOPES,
});

async function findFolder() {
    const drive = google.drive({ version: 'v3', auth });
    try {
        const res = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and name='Actas de JUFRA'",
            fields: 'nextPageToken, files(id, name)',
            spaces: 'drive',
        });
        
        const folders = res.data.files;
        if (folders.length === 0) {
            console.log('No se encontro la carpeta "Actas de JUFRA". Asegurate de compartirla con el correo que esta en el json.');
        } else {
            console.log(`¡Carpeta encontrada! ID: ${folders[0].id}`);
        }
    } catch (err) {
        console.error('La API devolvió un error: ' + err);
    }
}

findFolder();
