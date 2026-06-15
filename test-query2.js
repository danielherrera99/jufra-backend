const db = require('./db');
const BaseModel = require('./models/BaseModel');

BaseModel.prototype._applyQuery = function(knexQuery, query) {
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

            const pgKey = this.mappings[k] || k;

            if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
                for (let [op, opVal] of Object.entries(v)) {
                    switch(op) {
                        case '$exists':
                            if (opVal) builder.whereNotNull(pgKey);
                            else builder.whereNull(pgKey);
                            break;
                        case '$ne': builder.where(pgKey, '<>', opVal); break;
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
                            break; // handled with $regex usually
                        default:
                            // Fallback, treat as exact match (unlikely for operators but just in case)
                            break;
                    }
                }
            } else {
                builder.where(pgKey, v);
            }
        }
    };
    applyConditions(knexQuery, query);
    return knexQuery;
};

BaseModel.prototype.findOne = function(query = {}) {
    let knexQuery = db(this.tableName);
    this._applyQuery(knexQuery, query);
    return knexQuery.first();
};

BaseModel.prototype.find = function(query = {}) {
    let knexQuery = db(this.tableName);
    this._applyQuery(knexQuery, query);
    return knexQuery;
};

const Usuario = require('./models/Usuario');
const Evento = require('./models/Evento');

async function test() {
    try {
        const evQuery = { fecha: { $gte: '2026-06-14T00:00:00.000Z' } };
        const eventos = await Evento.find(evQuery);
        console.log('SUCCESS eventos!', eventos.length);

        const usQuery = { $or: [{email: 'francisco@jufra.org'}, {username: 'francisco'}] };
        const user = await Usuario.findOne(usQuery);
        console.log('SUCCESS user!', user ? user.username : 'not found');
        
    } catch(err) {
        console.error('CRASH:', err);
    }
    process.exit();
}
test();
