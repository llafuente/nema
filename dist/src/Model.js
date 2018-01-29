"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Type_1 = require("./Type");
const _ = require("lodash");
class Model {
    constructor() {
        this.api = null;
    }
    static parse(api, name, obj) {
        const m = new Model();
        Object.defineProperty(m, "api", { value: api, writable: true, enumerable: false });
        if (obj.allOf) {
            m.extends = obj.allOf[0].$ref.substring("#/definitions/".length);
            obj = obj.allOf[1];
        }
        m.name = name;
        m.interfaceName = `I${name}`;
        m.description = obj.description;
        m.type = Type_1.Type.parse(obj, obj.schema);
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