const db = require('../db');

// Mapeador determinista de MongoDB ObjectId a Postgres UUID
function toUUID(mongoId) {
    if (!mongoId) return null;
    const str = mongoId.toString().trim();
    if (str.length !== 24) return str; // Ya es UUID
    return `00000000-${str.substring(0, 4)}-${str.substring(4, 8)}-${str.substring(8, 12)}-${str.substring(12)}`;
}

class MongooseQueryMock {
    constructor(knexQuery, self, isMany = true) {
        this.knexQuery = knexQuery;
        this.self = self;
        this.isMany = isMany;
        this.populates = [];
    }

    select() { return this; }

    sort(sortObj) {
        if (typeof sortObj === 'object') {
            const [k, v] = Object.entries(sortObj)[0];
            const pgKey = this.self.mappings[k] || k;
            this.knexQuery = this.knexQuery.orderBy(pgKey, v === 1 || v === 'asc' ? 'asc' : 'desc');
        } else if (typeof sortObj === 'function') {
            this.memorySort = sortObj;
        }
        return this;
    }

    populate(field) {
        this.populates.push(field);
        return this;
    }

    limit(num) {
        this.knexQuery = this.knexQuery.limit(num);
        return this;
    }

    then(resolve, reject) {
        const executor = async () => {
            const result = this.isMany ? await this.knexQuery : await this.knexQuery.first();
            if (this.isMany) {
                let models = result.map(r => this.self.fromPostgres(r));
                if (this.memorySort) models.sort(this.memorySort);
                for (const field of this.populates) {
                    for (const m of models) if (m) await m.populate(field);
                }
                return models;
            } else {
                let model = this.self.fromPostgres(result);
                for (const field of this.populates) {
                    if (model) await model.populate(field);
                }
                return model;
            }
        };
        return executor().then(resolve, reject);
    }

    catch(reject) {
        return this.then(null, reject);
    }
}

class BaseModel {
    constructor(tableName, mappings = {}) {
        this.tableName = tableName;
        this.mappings = {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            ...mappings
        }; // Mapeos de camelCase (Mongoose) a snake_case (Postgres)
        this.reverseMappings = {};
        for (const [k, v] of Object.entries(this.mappings)) {
            this.reverseMappings[v] = k;
        }
    }

    // Convertir objeto de Mongoose a columnas Postgres
    toPostgres(data) {
        if (!data) return {};
        const pgData = {};
        for (const [k, v] of Object.entries(data)) {
            // Manejar traducción de claves
            const pgKey = this.mappings[k] || k;
            
            // Manejar traducción de IDs a UUIDs
            if (k === '_id' || k === 'usuario' || k === 'registradoPor' || k === 'creadoPor' || k === 'autor' || k === 'subidoPor' || k === 'remitente' || k === 'destinatario') {
                pgData[pgKey] = toUUID(v);
                continue;
            }

            // Ignorar virtuales o métodos
            if (typeof v === 'function') continue;
            
            // Ignorar campos virtuales y claves primarias redundantes
            if (k === 'nombreCompleto' || k === 'id' || k === '_id') continue;

            // Evitar que el valor antiguo en snake_case (ej. foto_url) 
            // sobreescriba el valor nuevo actualizado en camelCase (ej. foto)
            if (this.reverseMappings[k] && data[this.reverseMappings[k]] !== undefined && k !== this.reverseMappings[k]) {
                continue;
            }

            // Manejar ubicacion especial (lat/lng a latitud/longitud)
            if (k === 'ubicacion' && v && typeof v === 'object') {
                if (v.lat !== undefined) pgData.latitud = v.lat;
                if (v.lng !== undefined) pgData.longitud = v.lng;
                continue;
            }

            pgData[pgKey] = v;
        }
        return pgData;
    }

    // Convertir fila Postgres a objeto Mongoose
    fromPostgres(row) {
        if (!row) return null;
        const modelData = {
            _id: row.id,
            id: row.id
        };
        for (const [k, v] of Object.entries(row)) {
            if (k === 'id') continue;
            const modelKey = this.reverseMappings[k] || k;
            
            // Conservar las dos versiones (camelCase y snake_case) para máxima compatibilidad con el código actual
            modelData[modelKey] = v;
            if (modelKey !== k) {
                modelData[k] = v;
            }
        }

        // Reconstruir objeto ubicacion si existen coordenadas
        if (row.latitud !== undefined && row.longitud !== undefined && row.latitud !== null && row.longitud !== null) {
            modelData.ubicacion = {
                lat: parseFloat(row.latitud),
                lng: parseFloat(row.longitud)
            };
        }

        // Simular métodos básicos de documento Mongoose (como .save(), .populate())
        const self = this;
        modelData.save = async function() {
            const pgFields = self.toPostgres(this);
            delete pgFields.id;
            delete pgFields._id;
            await db(self.tableName).where('id', this.id).update(pgFields);
            return this;
        };

        modelData.populate = async function(field, selectFields) {
            // Simular populado de relaciones comunes
            if (field === 'usuario' || field === 'creadoPor' || field === 'autor' || field === 'subidoPor' || field === 'remitente' || field === 'destinatario') {
                const foreignIdKey = self.mappings[field] || field;
                const foreignId = this[foreignIdKey];
                if (foreignId) {
                    const u = await db('usuarios').where('id', foreignId).first();
                    if (u) {
                        this[field] = {
                            _id: u.id,
                            id: u.id,
                            nombre: u.nombre,
                            apellido: u.apellido,
                            foto: u.foto_url,
                            foto_url: u.foto_url,
                            nombreCompleto: `${u.nombre} ${u.apellido}`
                        };
                    } else {
                        this[field] = null;
                    }
                } else {
                    this[field] = null;
                }
            } else if (field === 'registradoPor') {
                if (this.registrado_por) {
                    const u = await db('usuarios').where('id', this.registrado_por).first();
                    if (u) {
                        this[field] = {
                            _id: u.id,
                            id: u.id,
                            nombre: u.nombre,
                            apellido: u.apellido
                        };
                    } else {
                        this[field] = null;
                    }
                } else {
                    this[field] = null;
                }
            } else if (field === 'asistentes') {
                const rows = await db('acta_asistentes').where('acta_id', this.id);
                const userIds = rows.map(r => r.usuario_id);
                if (userIds.length > 0) {
                    const users = await db('usuarios').whereIn('id', userIds);
                    this.asistentes = users.map(u => ({
                        _id: u.id,
                        id: u.id,
                        nombre: u.nombre,
                        apellido: u.apellido,
                        foto: u.foto_url,
                        nombreCompleto: `${u.nombre} ${u.apellido}`
                    }));
                } else {
                    this.asistentes = [];
                }
            } else if (field === 'participantes') {
                const rows = await db('servicio_participantes').where('servicio_id', this.id);
                const userIds = rows.map(r => r.usuario_id);
                if (userIds.length > 0) {
                    const users = await db('usuarios').whereIn('id', userIds);
                    this.participantes = users.map(u => ({
                        _id: u.id,
                        id: u.id,
                        nombre: u.nombre,
                        apellido: u.apellido,
                        foto: u.foto_url,
                        nombreCompleto: `${u.nombre} ${u.apellido}`
                    }));
                } else {
                    this.participantes = [];
                }
            } else if (field === 'acuerdos') {
                const agreements = await db('acuerdos').where('acta_id', this.id);
                for (const ac of agreements) {
                    if (ac.responsable_id) {
                        const u = await db('usuarios').where('id', ac.responsable_id).first();
                        if (u) {
                            ac.responsable = {
                                _id: u.id,
                                id: u.id,
                                nombre: u.nombre,
                                apellido: u.apellido,
                                nombreCompleto: `${u.nombre} ${u.apellido}`
                            };
                        }
                    }
                }
                this.acuerdos = agreements;
            }
            return this;
        };

        if (this.tableName === 'usuarios') {
            const bcrypt = require('bcryptjs');
            modelData.nombreCompleto = `${row.nombre} ${row.apellido}`;
            modelData.compararPassword = async function(passwordIngresado) {
                return await bcrypt.compare(passwordIngresado, this.password);
            };
        }

        return modelData;
    }

    _applyQuery(knexQuery, query) {
        if (!query || typeof query !== 'object') return knexQuery;
        
        const self = this;
        const applyConditions = (builder, conds) => {
            for (let [k, v] of Object.entries(conds)) {
                if (k === '$or') {
                    builder.where(function() {
                        v.forEach((orCond, idx) => {
                            if (idx === 0) this.where(b => applyConditions(b, orCond));
                            else this.orWhere(b => applyConditions(b, orCond));
                        });
                    });
                    continue;
                }
                if (k === '$and') {
                    builder.where(function() {
                        v.forEach(andCond => {
                            this.where(b => applyConditions(b, andCond));
                        });
                    });
                    continue;
                }

                const pgKey = self.mappings[k] || k;

                if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
                    for (let [op, opVal] of Object.entries(v)) {
                        switch(op) {
                            case '$exists':
                                if (opVal) builder.whereNotNull(pgKey);
                                else builder.whereNull(pgKey);
                                break;
                            case '$ne': 
                                if (opVal === null) builder.whereNotNull(pgKey);
                                else builder.where(pgKey, '<>', opVal); 
                                break;
                            case '$gt': builder.where(pgKey, '>', opVal); break;
                            case '$gte': builder.where(pgKey, '>=', opVal); break;
                            case '$lt': builder.where(pgKey, '<', opVal); break;
                            case '$lte': builder.where(pgKey, '<=', opVal); break;
                            case '$in': builder.whereIn(pgKey, opVal); break;
                            case '$nin': builder.whereNotIn(pgKey, opVal); break;
                            case '$regex':
                                builder.where(pgKey, '~*', opVal);
                                break;
                            case '$options':
                                break; 
                            default:
                                break;
                        }
                    }
                } else if (Array.isArray(v)) {
                    builder.whereIn(pgKey, v);
                } else {
                    builder.where(pgKey, v);
                }
            }
        };
        applyConditions(knexQuery, query);
        return knexQuery;
    };

    // --- MÉTODOS DE CONSULTA ESTILO MONGOOSE ---

    findById(id) {
        let knexQuery = db(this.tableName);
        if (id) knexQuery = knexQuery.where('id', toUUID(id));
        else knexQuery = knexQuery.whereRaw('1=0'); // Retornar vacío si no hay id
        return new MongooseQueryMock(knexQuery, this, false);
    }

    findOne(query = {}) {
        let knexQuery = db(this.tableName);
        this._applyQuery(knexQuery, query);
        return new MongooseQueryMock(knexQuery, this, false);
    }

    find(query = {}) {
        let knexQuery = db(this.tableName);
        this._applyQuery(knexQuery, query);
        return new MongooseQueryMock(knexQuery, this, true);
    }

    async create(data) {
        const pgFields = this.toPostgres(data);
        const [insertedRow] = await db(this.tableName).insert(pgFields).returning('*');
        return this.fromPostgres(insertedRow);
    }

    async findByIdAndUpdate(id, data, options = {}) {
        const pgFields = this.toPostgres(data);
        const [updatedRow] = await db(this.tableName).where('id', toUUID(id)).update(pgFields).returning('*');
        return this.fromPostgres(updatedRow);
    }

    async findByIdAndDelete(id) {
        const row = await this.findById(id);
        if (row) {
            await db(this.tableName).where('id', toUUID(id)).del();
        }
        return row;
    }

    async countDocuments(query = {}) {
        let knexQuery = db(this.tableName);
        for (const [k, v] of Object.entries(query)) {
            const pgKey = this.mappings[k] || k;
            knexQuery = knexQuery.where(pgKey, v);
        }
        const countRes = await knexQuery.count('id as count').first();
        return parseInt(countRes.count || 0);
    }

    async bulkWrite(ops) {
        for (const op of ops) {
            if (op.updateOne) {
                const { filter, update, upsert } = op.updateOne;
                const updateFields = update.$set || update;
                
                // Mapear filter
                let row;
                if (filter.usuario) {
                    row = await db(this.tableName)
                        .where('usuario_id', toUUID(filter.usuario))
                        .where('tipo_reunion', filter.tipoReunion)
                        .whereRaw("DATE(fecha) = DATE(?)", [new Date(updateFields.fecha)])
                        .first();
                } else if (filter.nombreInvitado) {
                    row = await db(this.tableName)
                        .where('nombre_invitado', filter.nombreInvitado)
                        .where('tipo_reunion', filter.tipoReunion)
                        .whereRaw("DATE(fecha) = DATE(?)", [new Date(updateFields.fecha)])
                        .first();
                }

                const pgFields = this.toPostgres(updateFields);
                if (row) {
                    // Update
                    await db(this.tableName).where('id', row.id).update(pgFields);
                } else if (upsert) {
                    // Insert
                    await db(this.tableName).insert(pgFields);
                }
            }
        }
    }

    async aggregate(pipeline) {
        if (this.tableName === 'asistencias' && pipeline.length === 2 && pipeline[0].$match && pipeline[1].$group) {
            const usuarioId = toUUID(pipeline[0].$match.usuario);
            const stats = await db('asistencias')
                .where('usuario_id', usuarioId)
                .select('tipo_reunion as _id')
                .count('id as total')
                .select(db.raw('SUM(CASE WHEN presente THEN 1 ELSE 0 END) as presentes'))
                .groupBy('tipo_reunion');
                
            return stats.map(s => ({
                _id: s._id,
                total: parseInt(s.total || 0),
                presentes: parseInt(s.presentes || 0)
            }));
        }
        return [];
    }
}

module.exports = BaseModel;
