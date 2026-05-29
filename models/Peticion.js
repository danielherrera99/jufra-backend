const BaseModel = require('./BaseModel');

const mappings = {
    autor: 'autor_id'
};

module.exports = new BaseModel('peticiones', mappings);
