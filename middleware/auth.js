const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Proteger rutas - verificar token
exports.proteger = async (req, res, next) => {
    let token;

    // Verificar si el token existe en los headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Verificar si el token existe
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No autorizado - Token no proporcionado'
        });
    }

    try {
        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Obtener usuario del token
        req.usuario = await Usuario.findById(decoded.id);

        if (!req.usuario) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'No autorizado - Token inválido'
        });
    }
};

// Autorizar roles específicos
exports.autorizarRoles = (...roles) => {
    return (req, res, next) => {
        const cargosConsejo = ['coordinador', 'vice-coordinador', 'secretario', 'tesorero', 'formador', 'animador'];

        // Si el usuario tiene rol permitido
        if (roles.includes(req.usuario.rol)) {
            return next();
        }

        // Si se requiere rol 'consejo' y el usuario tiene un cargo del consejo
        if (roles.includes('consejo') && cargosConsejo.includes(req.usuario.cargo)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `El rol ${req.usuario.rol} no tiene permiso para acceder a este recurso`
        });
    };
};

// Generar token JWT
exports.generarToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};
