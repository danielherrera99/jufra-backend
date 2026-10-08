const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function createTempTemplate() {
    const doc = await PDFDocument.create();
    
    // Landscape A4
    const page = doc.addPage([842, 595]);
    const { width, height } = page.getSize();
    
    // Añadir borde decorativo
    page.drawRectangle({
        x: 30,
        y: 30,
        width: width - 60,
        height: height - 60,
        borderColor: rgb(0.5, 0.3, 0.1),
        borderWidth: 5,
    });
    
    page.drawRectangle({
        x: 40,
        y: 40,
        width: width - 80,
        height: height - 80,
        borderColor: rgb(0.8, 0.6, 0.3),
        borderWidth: 2,
    });

    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    
    // Título Principal
    const title = 'CERTIFICADO DE BENDICION';
    const titleWidth = font.widthOfTextAtSize(title, 40);
    page.drawText(title, {
        x: (width / 2) - (titleWidth / 2),
        y: height - 120,
        size: 40,
        font: font,
        color: rgb(0.4, 0.2, 0.1)
    });

    // Subtítulo
    const fontNormal = await doc.embedFont(StandardFonts.Helvetica);
    const subtitle = 'Otorga el presente certificado a la mascota:';
    const subWidth = fontNormal.widthOfTextAtSize(subtitle, 20);
    page.drawText(subtitle, {
        x: (width / 2) - (subWidth / 2),
        y: height - 200,
        size: 20,
        font: fontNormal,
        color: rgb(0.2, 0.2, 0.2)
    });

    // Línea para la mascota
    page.drawLine({
        start: { x: 200, y: height - 280 },
        end: { x: width - 200, y: height - 280 },
        thickness: 2,
        color: rgb(0.5, 0.5, 0.5)
    });

    // Texto de dueño
    const duenoText = 'Acompañado(a) de su dueño(a):';
    const duenoWidth = fontNormal.widthOfTextAtSize(duenoText, 18);
    page.drawText(duenoText, {
        x: (width / 2) - (duenoWidth / 2),
        y: height - 360,
        size: 18,
        font: fontNormal,
        color: rgb(0.2, 0.2, 0.2)
    });

    // Línea para el dueño
    page.drawLine({
        start: { x: 250, y: height - 420 },
        end: { x: width - 250, y: height - 420 },
        thickness: 1,
        color: rgb(0.5, 0.5, 0.5)
    });

    // Sello o firma temporal
    const dateText = 'Parroquia San Francisco de Asís - JUFRA Pomalca';
    const dateWidth = fontNormal.widthOfTextAtSize(dateText, 14);
    page.drawText(dateText, {
        x: (width / 2) - (dateWidth / 2),
        y: 80,
        size: 14,
        font: fontNormal,
        color: rgb(0.3, 0.3, 0.3)
    });

    const pdfBytes = await doc.save();
    
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
    }
    
    const filePath = path.join(uploadsDir, 'plantilla_certificado.pdf');
    fs.writeFileSync(filePath, pdfBytes);
    console.log('✅ Plantilla temporal PDF generada con éxito en:', filePath);
}

createTempTemplate();
