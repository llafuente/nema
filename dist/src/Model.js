"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Type_1 = require("./Type");
const _ = require("lodash");
const pluralize = require("pluralize");
class Model {
    constructor() {
        this.api = null;
    }
    static parseSwagger(api, name, obj) {
        const m = new Model();
        Object.defineProperty(m, "api", { value: api, writable: true, enumerable: false });
        if (obj.allOf) {
            m.extends = obj.allOf[0].$ref.substring("#/definitions/".length);
            obj = obj.allOf[1];
        }
        m.name = name;
        // this need review, i'm +1 , but also see unforseen consecuences
        // remove Dto from name
        //if (m.name.substr(m.name.length -3).toLowerCase() == "dto") {
        //  m.name = m.name.substr(0, m.name.length -3);
        //}
        m.type = Type_1.Type.parseSwagger(obj, obj.schema, true);
        m.description = obj.description;
        //m.dtoName = `${name}Dto`;
        m.interfaceName = `I${name}`;
        m.mongooseInterface = `I${name}Model`;
        m.mongooseSchema = `${name}Schema`;
        m.mongooseRepository = `${name}Repository`;
        m.mongooseModel = `${name}Model`;
        m.mongooseCollection = pluralize.plural(this.name.toLowerCase());
        return m;
    }
    eachProperty(cb) {
        if (this.type.type !== "object") {
            throw new Error("wtf!?");
        }
        _.each(this.type.properties, cb);
    }
    eachParentProperty(cb) {
        this.api.models[this.extends].eachProperty(cb);
    }
}
exports.Model = Model;
//# sourceMappingURL=Model.js.map