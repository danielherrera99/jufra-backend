const BaseModel = require('./BaseModel');

class FinanzaModel extends BaseModel {
    constructor() {
        super('finanzas', {
            // Mapeos adicionales si se necesitan (BaseModel ya mapea createdAt, updatedAt)
            comprobanteUrl: 'comprobante_url',
            registradoPor: 'registrado_por'
        });
    }

    // Convertir fila Postgres a objeto Mongoose (sobrescribir para populate)
    fromPostgres(row) {
        const model = super.fromPostgres(row);
        if (!model) return null;

        // Custom populate logic for registrado_por if not handled generically by BaseModel
        const originalPopulate = model.populate;
        model.populate = async function(field) {
            if (field === 'registradoPor' || field === 'registrado_por') {
                const db = require('../db');
                if (this.registrado_por) {
                    const u = await db('usuarios').where('id', this.registrado_por).first();
                    if (u) {
                        this.registradoPor = {
                            _id: u.id,
                            id: u.id,
                            nombre: u.nombre,
                            apellido: u.apellido,
                            nombreCompleto: `${u.nombre} ${u.apellido}`,
                            foto_url: u.foto_url,
                            foto: u.foto_url
                        };
                    } else {
                        this.registradoPor = null;
                    }
                }
            } else {
                await originalPopulate.call(this, field);
            }
            return this;
        };

        return model;
    }
}

module.exports = new FinanzaModel();
