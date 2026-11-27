const db = require('../db');

// Mapeador determinista de MongoDB ObjectId a Postgres UUID
function toUUID(mongoId) {
    if (!mongoId) return null;
    const str = mongoId.toString().trim();
    if (str.length !== 24) return str; // Ya es UUID
    return `00000000-${str.substring(0, 4)}-${str.substring(4, 8)}-${str.substring(8, 12)}-${str.substring(12)}`;
}

// Función de población masiva por lotes (Batch Populate) para evitar problemas de N+1 queries
async function batchPopulate(models, field, self) {
    if (!models || models.length === 0) return;
    const cleanField = typeof field === 'string' ? field.split(' ')[0] : (field?.path || '');

    // 1. Relaciones directas con usuarios (usuario, creadoPor, autor, subidoPor, remitente, destinatario)
    if (['usuario', 'creadoPor', 'autor', 'subidoPor', 'remitente', 'destinatario'].includes(cleanField)) {
        const foreignIdKey = self.mappings[cleanField] || cleanField;
        const ids = [...new Set(models.map(m => {
            const val = m[foreignIdKey] !== undefined ? m[foreignIdKey] : m[cleanField];
            if (!val) return null;
            return typeof val === 'object' ? (val._id || val.id) : val;
        }).filter(Boolean))];

        const userMap = new Map();
        if (ids.length > 0) {
            const uuidList = ids.map(id => toUUID(id)).filter(Boolean);
            const users = await db('usuarios').whereIn('id', uuidList);
            for (const u of users) {
                userMap.set(u.id, {
                    _id: u.id,
                    id: u.id,
                    nombre: u.nombre,
                    apellido: u.apellido,
                    foto: u.foto_url,
                    foto_url: u.foto_url,
                    cargo: u.cargo,
                    nombreCompleto: `${u.nombre} ${u.apellido}`
                });
            }
        }

        for (const m of models) {
            const val = m[foreignIdKey] !== undefined ? m[foreignIdKey] : m[cleanField];
            const rawId = typeof val === 'object' ? (val?._id || val?.id) : val;
            const uuid = toUUID(rawId);
            m[cleanField] = (uuid && userMap.has(uuid)) ? userMap.get(uuid) : null;
        }
        return;
    }

    // 2. Relación registradoPor
    if (cleanField === 'registradoPor') {
        const ids = [...new Set(models.map(m => {
            const val = m.registrado_por !== undefined ? m.registrado_por : m.registradoPor;
            if (!val) return null;
            return typeof val === 'object' ? (val._id || val.id) : val;
        }).filter(Boolean))];

        const userMap = new Map();
        if (ids.length > 0) {
            const uuidList = ids.map(id => toUUID(id)).filter(Boolean);
            const users = await db('usuarios').whereIn('id', uuidList);
            for (const u of users) {
                userMap.set(u.id, {
                    _id: u.id,
                    id: u.id,
                    nombre: u.nombre,
                    apellido: u.apellido,
                    foto: u.foto_url,
                    foto_url: u.foto_url,
                    cargo: u.cargo,
                    nombreCompleto: `${u.nombre} ${u.apellido}`
                });
            }
        }

        for (const m of models) {
            const val = m.registrado_por !== undefined ? m.registrado_por : m.registradoPor;
            const rawId = typeof val === 'object' ? (val?._id || val?.id) : val;
            const uuid = toUUID(rawId);
            m[cleanField] = (uuid && userMap.has(uuid)) ? userMap.get(uuid) : null;
        }
        return;
    }

    // 3. Relación asistentes (actas)
    if (cleanField === 'asistentes') {
        const ids = models.map(m => toUUID(m.id)).filter(Boolean);
        if (ids.length === 0) {
            for (const m of models) m.asistentes = [];
            return;
        }
        const rows = await db('acta_asistentes').whereIn('acta_id', ids);
        const userIds = [...new Set(rows.map(r => toUUID(r.usuario_id)).filter(Boolean))];
        const userMap = new Map();
        if (userIds.length > 0) {
            const users = await db('usuarios').whereIn('id', userIds);
            for (const u of users) {
                userMap.set(u.id, {
                    _id: u.id,
                    id: u.id,
                    nombre: u.nombre,
                    apellido: u.apellido,
                    foto: u.foto_url,
                    cargo: u.cargo,
                    nombreCompleto: `${u.nombre} ${u.apellido}`
                });
            }
        }
        const actaMap = new Map();
        for (const r of rows) {
            const aId = toUUID(r.acta_id);
            if (!actaMap.has(aId)) actaMap.set(aId, []);
            const u = userMap.get(toUUID(r.usuario_id));
            if (u) actaMap.get(aId).push(u);
        }
        for (const m of models) {
            m.asistentes = actaMap.get(toUUID(m.id)) || [];
        }
        return;
    }

    // 4. Relación participantes (servicios)
    if (cleanField === 'participantes') {
        const ids = models.map(m => toUUID(m.id)).filter(Boolean);
        if (ids.length === 0) {
            for (const m of models) m.participantes = [];
            return;
        }
        const rows = await db('servicio_participantes').whereIn('servicio_id', ids);
        const userIds = [...new Set(rows.map(r => toUUID(r.usuario_id)).filter(Boolean))];
        const userMap = new Map();
        if (userIds.length > 0) {
            const users = await db('usuarios').whereIn('id', userIds);
            for (const u of users) {
                userMap.set(u.id, {
                    _id: u.id,
                    id: u.id,
                    nombre: u.nombre,
                    apellido: u.apellido,
                    foto: u.foto_url,
                    cargo: u.cargo,
                    nombreCompleto: `${u.nombre} ${u.apellido}`
                });
            }
        }
        const servMap = new Map();
        for (const r of rows) {
            const sId = toUUID(r.servicio_id);
            if (!servMap.has(sId)) servMap.set(sId, []);
            const u = userMap.get(toUUID(r.usuario_id));
            if (u) servMap.get(sId).push(u);
        }
        for (const m of models) {
            m.participantes = servMap.get(toUUID(m.id)) || [];
        }
        return;
    }

    // 5. Relación acuerdos (actas)
    if (cleanField === 'acuerdos' || cleanField === 'acuerdos.responsable') {
        const ids = models.map(m => toUUID(m.id)).filter(Boolean);
        if (ids.length === 0) {
            for (const m of models) m.acuerdos = [];
            return;
        }
        const agreements = await db('acuerdos').whereIn('acta_id', ids);
        const respIds = [...new Set(agreements.map(a => toUUID(a.responsable_id)).filter(Boolean))];
        const userMap = new Map();
        if (respIds.length > 0) {
            const users = await db('usuarios').whereIn('id', respIds);
            for (const u of users) {
                userMap.set(u.id, {
                    _id: u.id,
                    id: u.id,
                    nombre: u.nombre,
                    apellido: u.apellido,
                    nombreCompleto: `${u.nombre} ${u.apellido}`
                });
            }
        }
        const agreementMap = new Map();
        for (const ac of agreements) {
            const aId = toUUID(ac.acta_id);
            if (!agreementMap.has(aId)) agreementMap.set(aId, []);
            const rId = toUUID(ac.responsable_id);
            if (rId && userMap.has(rId)) {
                ac.responsable = userMap.get(rId);
            }
            agreementMap.get(aId).push(ac);
        }
        for (const m of models) {
            m.acuerdos = agreementMap.get(toUUID(m.id)) || [];
        }
        return;
    }

    // Fallback: Si es un campo custom no mapeado
    for (const m of models) {
        if (m && typeof m._singlePopulate === 'function') {
            await m._singlePopulate(field);
        }
    }
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
            for (const [k, v] of Object.entries(sortObj)) {
                const pgKey = this.self.mappings[k] || k;
                this.knexQuery = this.knexQuery.orderBy(pgKey, v === 1 || v === 'asc' ? 'asc' : 'desc');
            }
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
                    await batchPopulate(models, field, this.self);
                }
                return models;
            } else {
                let model = this.self.fromPostgres(result);
                if (model) {
                    for (const field of this.populates) {
                        await batchPopulate([model], field, this.self);
                    }
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

            if (v && (Array.isArray(v) || (typeof v === 'object' && v.constructor === Object))) {
                pgData[pgKey] = JSON.stringify(v);
            } else {
                pgData[pgKey] = v;
            }
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
            // Interceptar guardado de contraseñas sin encriptar
            if (self.tableName === 'usuarios' && this.password && !this.password.startsWith('$2')) {
                const bcrypt = require('bcryptjs');
                const salt = await bcrypt.genSalt(10);
                this.password = await bcrypt.hash(this.password, salt);
            }

            const pgFields = self.toPostgres(this);
            delete pgFields.id;
            delete pgFields._id;
            await db(self.tableName).where('id', this.id).update(pgFields);
            return this;
        };

        modelData.deleteOne = async function() {
            await db(self.tableName).where('id', this.id).del();
            return this;
        };

        modelData.populate = async function(field, selectFields) {
            await batchPopulate([this], field, self);
            return this;
        };

        if (this.tableName === 'usuarios') {
            const bcrypt = require('bcryptjs');
            modelData.nombreCompleto = `${row.nombre || ''} ${row.apellido || ''}`.trim();
            modelData.compararPassword = async function(passwordIngresado) {
                if (!passwordIngresado || !this.password) return false;
                try {
                    return await bcrypt.compare(String(passwordIngresado), String(this.password));
                } catch (err) {
                    console.error('Error al comparar contraseñas en BaseModel:', err);
                    return false;
                }
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
                            if (idx === 0) this.where(function() { applyConditions(this, orCond) });
                            else this.orWhere(function() { applyConditions(this, orCond) });
                        });
                    });
                    continue;
                }
                if (k === '$and') {
                    builder.where(function() {
                        v.forEach(andCond => {
                            this.where(function() { applyConditions(this, andCond) });
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
        if (this.tableName === 'usuarios' && data.password && !data.password.startsWith('$2')) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }
        const pgFields = this.toPostgres(data);
        const [insertedRow] = await db(this.tableName).insert(pgFields).returning('*');
        return this.fromPostgres(insertedRow);
    }

    async findByIdAndUpdate(id, data, options = {}) {
        if (this.tableName === 'usuarios' && data.password && !data.password.startsWith('$2')) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }
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

    async updateMany(query = {}, updateFields = {}) {
        let knexQuery = db(this.tableName);
        const self = this;
        
        // Aplicar condicionales de query
        const applyConditions = (builder, conds) => {
            for (let [k, v] of Object.entries(conds)) {
                if (k === '$or') {
                    builder.where(function() {
                        v.forEach((orCond, idx) => {
                            if (idx === 0) this.where(function() { applyConditions(this, orCond) });
                            else this.orWhere(function() { applyConditions(this, orCond) });
                        });
                    });
                    continue;
                }
                if (k === '$and') {
                    builder.where(function() {
                        v.forEach(andCond => {
                            this.where(function() { applyConditions(this, andCond) });
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
                            case '$in': 
                                builder.whereIn(pgKey, opVal); 
                                break;
                            case '$regex':
                                builder.where(pgKey, 'ilike', `%${opVal.source || opVal}%`.replace(/\.\*/g, '%').replace(/\^/g, '').replace(/\$/g, ''));
                                break;
                            case '$gte': builder.where(pgKey, '>=', opVal); break;
                            case '$gt': builder.where(pgKey, '>', opVal); break;
                            case '$lte': builder.where(pgKey, '<=', opVal); break;
                            case '$lt': builder.where(pgKey, '<', opVal); break;
                        }
                    }
                } else if (Array.isArray(v)) {
                    builder.whereIn(pgKey, v);
                } else if (k === 'usuario' || k === 'registradoPor' || k === 'creadoPor' || k === 'autor' || k === 'subidoPor' || k === 'remitente' || k === 'destinatario' || k === '_id') {
                    builder.where(pgKey, toUUID(v));
                } else if (v === null) {
                    builder.whereNull(pgKey);
                } else {
                    builder.where(pgKey, v);
                }
            }
        };

        knexQuery.where(function() { applyConditions(this, query) });
        
        const pgFields = this.toPostgres(updateFields);
        const rows = await knexQuery.update(pgFields).returning('*');
        return { modifiedCount: rows.length };
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
