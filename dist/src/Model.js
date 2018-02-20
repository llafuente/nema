"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Type_1 = require("./Type");
const _ = require("lodash");
const pluralize = require("pluralize");
class Model {
    constructor() {
        this.api = null;
        /** type is internal, not really defined by user but used by it */
        this.internal = false;
        /** Mark model to be exported as database/collection */
        this.isDb = false;
    }
    static parseSwagger(api, name, obj) {
        const m = new Model();
        Object.defineProperty(m, "api", { value: api, writable: true, enumerable: false });
        if (obj.allOf) {
            m.extends = obj.allOf[0].$ref;
            obj = obj.allOf[1];
        }
        m.name = name;
        m.filename = `/src/models/${name}.ts`;
        m.isDb = !!obj["x-nema-db"];
        // force: naming convention
        // this need review, i'm +1 , but also see unforseen consecuences
        // remove Dto from name
        // if (m.name.substr(m.name.length -3).toLowerCase() == "dto") {
        //   m.name = m.name.substr(0, m.name.length -3);
        // }
        m.type = Type_1.Type.parseSwagger(api, obj, name, true);
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
            console.error(this);
            throw new Error("wtf!?");
        }
        _.each(this.type.properties, cb);
    }
    eachParentProperty(cb) {
        if (!this.extends) {
            console.error(this);
            throw new Error("This model has no parent model");
        }
        const m = this.api.getReference(this.extends);
        m.eachProperty(cb);
    }
    isEnum() {
        return this.type.type == "enum";
    }
}
exports.Model = Model;
//# sourceMappingURL=Model.js.map