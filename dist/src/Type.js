"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
exports.Models = {};
class Type {
    constructor() {
        this.description = undefined;
        this.properties = undefined;
        this.items = undefined;
        this.referenceModel = undefined;
    }
    static parse(obj, modelName = null) {
        const t = new Type();
        t.type = obj.type;
        t.description = obj.description;
        if (obj.properties != null) {
            t.properties = _.mapValues(obj.properties, (x) => {
                return Type.parse(x);
            });
        }
        if (obj.items != null) {
            t.items = Type.parse(obj.items);
        }
        if (obj.$ref) {
            t.referenceModel = obj.$ref.substring("#/definitions/".length);
        }
        if (modelName) {
            if (exports.Models[modelName]) {
                throw new Error("Model redefinition: ${modelName}");
            }
            exports.Models[modelName] = t;
        }
        return t;
    }
    isPrimitive() {
        if (this.type == "array") {
            return this.items.isPrimitive();
        }
        return ["integer", "string", "boolean", "number"].indexOf(this.type) !== -1;
    }
    toBaseType() {
        switch (this.type) {
            case "array":
                return this.items.toBaseType();
        }
        if (this.referenceModel) {
            return this.referenceModel;
        }
        throw new Error("???");
    }
    toTypeScriptType() {
        // defer to subschema
        if (this.referenceModel) {
            return this.referenceModel;
            //return Models[this.referenceModel].toTypeScriptType();
        }
        switch (this.type) {
            case "string":
                return "string";
            case "array":
                if (this.items.referenceModel) {
                    return `${this.items.referenceModel}[]`;
                }
                return `${this.items.toTypeScriptType()}[]`;
            case "number":
            case "integer":
                return "number";
        }
        if (!this.type) {
            return "void";
        }
        return this.type;
    }
    getParser(src) {
        if (this.type == "array") {
            if (this.items.isPrimitive()) {
                return `(${src} || []).map((x) => Cast.${this.items.type}(x))`;
            }
            else {
                return `(${src} || []).map((x) => ${this.items.toTypeScriptType()}.parse(x))`;
            }
        }
        else if (this.isPrimitive()) {
            return `Cast.${this.type}(${src})`;
        }
        // model
        return `${this.toTypeScriptType()}.parse(${src})`;
    }
}
exports.Type = Type;
//# sourceMappingURL=Type.js.map