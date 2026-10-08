const BaseModel = require('./BaseModel');

class RegistroMascota extends BaseModel {
    constructor() {
        super('registros_mascotas');
        this.mappings = {
            idSolicitud: 'id_solicitud',
            nombreDueno: 'nombre_dueno',
            nombreMascota: 'nombre_mascota',
            whatsapp: 'whatsapp',
            recibioBendicion: 'recibio_bendicion',
            recibioVacuna: 'recibio_vacuna',
            recibioDesparasitacion: 'recibio_desparasitacion',
            estadoAprobado: 'estado_aprobado',
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        };
        this.reverseMappings = Object.fromEntries(
            Object.entries(this.mappings).map(([k, v]) => [v, k])
        );
    }
}

module.exports = new RegistroMascota();
