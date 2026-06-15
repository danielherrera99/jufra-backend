const MongooseQueryMock = class {
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
    then(resolve, reject) {
        const executor = async () => {
            const result = this.isMany ? await this.knexQuery : await this.knexQuery.first();
            if (this.isMany) {
                let models = result.map(r => this.self.fromPostgres(r));
                if (this.memorySort) models.sort(this.memorySort);
                for (const field of this.populates) {
                    for (const m of models) if(m) await m.populate(field);
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
};

const db = require('./db');
const BaseModel = require('./models/BaseModel');

// Monkey patch find to return MongooseQueryMock
BaseModel.prototype.find = function(query = {}) {
    let knexQuery = db(this.tableName);
    // Traducir consultas
    for (let [k, v] of Object.entries(query)) {
        if (k === 'activo') {
            knexQuery = knexQuery.where('activo', v);
            continue;
        }
        const pgKey = this.mappings[k] || k;
        knexQuery = knexQuery.where(pgKey, v);
    }
    return new MongooseQueryMock(knexQuery, this, true);
};

const Usuario = require('./models/Usuario');
async function test() {
    try {
        const usuarios = await Usuario.find({activo: true}).sort({username: 1}).select('-password');
        console.log('SUCCESS! count:', usuarios.length);
        console.log('First user:', usuarios[0].username);
    } catch(err) {
        console.error('CRASH:', err);
    }
    process.exit();
}
test();
