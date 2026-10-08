const RegistroMascota = require('../models/RegistroMascota');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Función para generar ID único
const generarIdSolicitudUnico = async () => {
    let id;
    let existe = true;
    let intentos = 0;
    while (existe) {
        // Genera de 100 a 999 (o de 1000 a 9999 si ya hubo muchos intentos)
        const min = intentos > 50 ? 1000 : 100;
        const max = intentos > 50 ? 9000 : 900;
        const num = Math.floor(min + Math.random() * max);
        id = 'J-' + num;
        
        // Verificar en BD
        const count = await RegistroMascota.countDocuments({ id_solicitud: id });
        if (count === 0) {
            existe = false;
        }
        intentos++;
        if (intentos > 100) break; // Por seguridad extrema
    }
    return id;
};

exports.crearRegistro = async (req, res) => {
    try {
        const { nombreDueno, nombreMascota, whatsapp } = req.body;

        if (!nombreDueno || !nombreMascota || !whatsapp) {
            return res.status(400).json({ success: false, message: 'Por favor, llena todos los campos.' });
        }

        if (nombreDueno.length > 12) {
            return res.status(400).json({ success: false, message: 'El nombre del dueño debe tener máximo 12 caracteres.' });
        }

        if (!/^\d+$/.test(whatsapp)) {
            return res.status(400).json({ success: false, message: 'El WhatsApp debe contener solo números.' });
        }

        const idSolicitudUnico = await generarIdSolicitudUnico();

        const nuevoRegistro = {
            idSolicitud: idSolicitudUnico,
            nombreDueno,
            nombreMascota,
            whatsapp,
            recibioBendicion: false,
            recibioVacuna: false,
            recibioDesparasitacion: false,
            estadoAprobado: false
        };

        const result = await RegistroMascota.create(nuevoRegistro);
        
        // Retornamos el objeto insertado (usualmente create devuelve el row o insert id)
        res.status(201).json({
            success: true,
            message: 'Registro exitoso.',
            data: nuevoRegistro
        });
    } catch (error) {
        console.error('Error al crear registro de mascota:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
};

exports.obtenerRegistros = async (req, res) => {
    try {
        const registros = await RegistroMascota.find({}).sort({ created_at: -1 });
        res.status(200).json({
            success: true,
            data: registros
        });
    } catch (error) {
        console.error('Error al obtener registros:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
};

exports.actualizarServicios = async (req, res) => {
    try {
        const { id } = req.params;
        const { recibioBendicion, recibioVacuna, recibioDesparasitacion } = req.body;

        const registro = await RegistroMascota.findById(id);
        if (!registro) {
            return res.status(404).json({ success: false, message: 'Registro no encontrado.' });
        }

        const result = await RegistroMascota.findByIdAndUpdate(id, {
            recibioBendicion: recibioBendicion !== undefined ? recibioBendicion : registro.recibioBendicion,
            recibioVacuna: recibioVacuna !== undefined ? recibioVacuna : registro.recibioVacuna,
            recibioDesparasitacion: recibioDesparasitacion !== undefined ? recibioDesparasitacion : registro.recibioDesparasitacion
        });

        res.status(200).json({
            success: true,
            message: 'Servicios actualizados correctamente.'
        });
    } catch (error) {
        console.error('Error al actualizar servicios:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
};

exports.aprobarRegistro = async (req, res) => {
    try {
        const { id } = req.params;
        const registro = await RegistroMascota.findById(id);
        if (!registro) {
            return res.status(404).json({ success: false, message: 'Registro no encontrado.' });
        }

        await RegistroMascota.findByIdAndUpdate(id, { estadoAprobado: true });
        
        res.status(200).json({
            success: true,
            message: 'Registro aprobado correctamente.'
        });
    } catch (error) {
        console.error('Error al aprobar registro:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
};

exports.consultarEstado = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const registro = await RegistroMascota.findOne({ id_solicitud: idSolicitud });
        
        if (!registro) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
        }

        res.status(200).json({
            success: true,
            data: {
                idSolicitud: registro.idSolicitud,
                nombreDueno: registro.nombreDueno,
                nombreMascota: registro.nombreMascota,
                estadoAprobado: registro.estadoAprobado
            }
        });
    } catch (error) {
        console.error('Error al consultar estado:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
};

// Generación de PDF (Requiere instalar pdf-lib en el backend)
// Por ahora dejamos el endpoint preparado para cuando instalemos pdf-lib
exports.generarCertificadoPDF = async (req, res) => {
    try {
        const { idSolicitud } = req.params;
        const registro = await RegistroMascota.findOne({ id_solicitud: idSolicitud });
        
        if (!registro) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada.' });
        }

        if (!registro.estadoAprobado) {
            return res.status(400).json({ success: false, message: 'Tu registro aún no ha sido validado en la mesa de atención.' });
        }

        const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
        const fontkit = require('@pdf-lib/fontkit'); // opcional si se usan fuentes personalizadas

        // Lógica de selección de plantilla
        let templateName = 'plantilla_certificado.pdf'; // fallback
        const { recibioBendicion, recibioVacuna, recibioDesparasitacion } = registro;

        if (recibioVacuna && recibioDesparasitacion && recibioBendicion) {
            templateName = 'plantilla_v_d_b.pdf';
        } else if (recibioVacuna && recibioDesparasitacion && !recibioBendicion) {
            templateName = 'plantilla_v_d.pdf';
        } else if (recibioVacuna && !recibioDesparasitacion && recibioBendicion) {
            templateName = 'plantilla_v_b.pdf';
        } else if (!recibioVacuna && recibioDesparasitacion && recibioBendicion) {
            templateName = 'plantilla_d_b.pdf';
        } else if (!recibioVacuna && !recibioDesparasitacion && recibioBendicion) {
            templateName = 'plantilla_b.pdf';
        } else if (recibioVacuna && !recibioDesparasitacion && !recibioBendicion) {
            templateName = 'plantilla_v.pdf'; // Pendiente de crear
        } else if (!recibioVacuna && recibioDesparasitacion && !recibioBendicion) {
            templateName = 'plantilla_d.pdf'; // Pendiente de crear
        }

        const templatePath = path.join(__dirname, '..', 'templates', templateName);
        
        if (!fs.existsSync(templatePath)) {
             return res.status(400).json({ success: false, message: 'Plantilla de certificado no encontrada en el servidor. Comunícate con el administrador.' });
        }

        const templateBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(templateBytes);
        pdfDoc.registerFontkit(fontkit);

        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();
        
        const templateConfig = {
            'plantilla_v_d_b.pdf': { petY: 0.535, ownerY: 0.485, ownerX: 0.48 },
            'plantilla_v_d.pdf':   { petY: 0.535, ownerY: 0.49,  ownerX: 0.53 },
            'plantilla_v_b.pdf':   { petY: 0.535, ownerY: 0.49,  ownerX: 0.48 },
            'plantilla_d_b.pdf':   { petY: 0.535, ownerY: 0.49,  ownerX: 0.48 },
            'plantilla_b.pdf':     { petY: 0.51,  ownerY: 0.455, ownerX: 0.42 },
            'plantilla_v.pdf':     { petY: 0.525, ownerY: 0.48,  ownerX: 0.50 },
            'plantilla_d.pdf':     { petY: 0.525, ownerY: 0.48,  ownerX: 0.50 },
            'plantilla_certificado.pdf': { petY: 0.52, ownerY: 0.485, ownerX: 0.48 } // fallback
        };

        const coords = templateConfig[templateName] || templateConfig['plantilla_certificado.pdf'];

        // Función auxiliar para centrar texto en X, usando una Y específica
        const drawCenteredText = (text, y, size, fontToUse, color) => {
            const textWidth = fontToUse.widthOfTextAtSize(text, size);
            firstPage.drawText(text, {
                x: (width / 2) - (textWidth / 2),
                y: height * y,
                size: size,
                font: fontToUse,
                color: color
            });
        };

        // Función para dibujar texto alineado a la izquierda en X y Y específicos (proporcionales)
        const drawTextAt = (text, xPct, yPct, size, fontToUse, color) => {
            firstPage.drawText(text, {
                x: width * xPct, // Alineado a la izquierda a partir de este porcentaje
                y: height * yPct,
                size: size,
                font: fontToUse,
                color: color
            });
        };

        // Escribir Nombre de Mascota (siempre centrado)
        drawCenteredText(
            registro.nombreMascota.toUpperCase(),
            coords.petY,
            40,
            await pdfDoc.embedFont(StandardFonts.HelveticaBold),
            rgb(0.4, 0.2, 0)
        );

        // Escribir Nombre de Dueño (en las coordenadas específicas)
        drawTextAt(
            registro.nombreDueno.toUpperCase(),
            coords.ownerX,
            coords.ownerY,
            24,
            await pdfDoc.embedFont(StandardFonts.Helvetica),
            rgb(0.2, 0.2, 0.2)
        );

        const pdfBytes = await pdfDoc.save();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Certificado_${registro.nombreMascota.replace(/ /g, '_')}.pdf`);
        res.send(Buffer.from(pdfBytes));
        
    } catch (error) {
        console.error('Error al generar PDF:', error);
        res.status(500).json({ success: false, message: 'Error al generar el certificado.' });
    }
};
