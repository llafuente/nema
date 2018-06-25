"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
exports.controls = ["hidden", "customZone", "checkboxList"];
var Kind;
(function (Kind) {
    Kind["ID"] = "id";
    Kind["STRING"] = "string";
    Kind["NUMBER"] = "number";
    Kind["BOOLEAN"] = "boolean";
    Kind["OBJECT"] = "object";
    Kind["ARRAY"] = "array";
    Kind["VOID"] = "void";
    Kind["ENUM"] = "enum";
    Kind["REFERENCE"] = "reference";
    Kind["DATE"] = "date";
    Kind["FILE"] = "file";
})(Kind = exports.Kind || (exports.Kind = {}));
;
class Type {
    constructor() {
        this.api = null;
        this.type = null;
        this.description = undefined;
        /** is type defined at definitions?  */
        this.isDefinition = undefined;
        /** is a foreign key?  */
        this.foreignKey = undefined;
        /** Object properties */
        this.properties = undefined;
        /** Array sub type */
        this.items = undefined;
        /** Enum choices */
        this.choices = undefined;
        /** Reference to another model */
        this.referenceModel = undefined;
        this.required = false;
        this.readOnly = false;
        this.control = null;
    }
    /**
     * Parse type from swagger
     * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#schemaObject
     */
    static void() {
        const t = new Type();
        t.type = Kind.VOID;
        return t;
    }
    static parseSwagger(api, obj, modelName, isDefinition) {
        const t = new Type();
        Object.defineProperty(t, "api", { value: api, writable: true, enumerable: false });
        t.name = modelName;
        t.isDefinition = isDefinition;
        obj = obj || { type: "void" };
        t.description = obj.description;
        // sanity checks
        if (!modelName && obj.type == "object" && obj.properties) {
            console.error(obj);
            throw new Error("Object need to be in definitions at first level");
        }
        // allow type:any inside objects
        // dont allow empty object types
        if (modelName && obj.type == "object" && !obj.properties) {
            console.error(modelName, obj);
            throw new Error("missing type.properties");
        }
        if (obj.type == "array" && !obj.items) {
            console.error(modelName, obj);
            throw new Error("missing type.items");
        }
        if (obj.type && obj.$ref) {
            console.error(modelName, obj);
            throw new Error("type has type and reference");
        }
        if (!isDefinition && obj.enum) {
            console.error(obj);
            throw new Error("enum need to be in definitions at first level");
        }
        switch ((obj.type || "").toLocaleLowerCase()) {
            case "":
            case "void":
                t.type = Kind.VOID;
                break;
            case "object":
                t.type = Kind.OBJECT;
                t.properties = _.mapValues(obj.properties, (x) => {
                    return Type.parseSwagger(api, x, null, false);
                });
                (obj.required || []).forEach((r) => {
                    if (!t.properties[r]) {
                        console.error(obj);
                        throw new Error(`cannot found required property name: ${r}`);
                    }
                    t.properties[r].required = true;
                });
                break;
            case "array":
                t.type = Kind.ARRAY;
                t.items = Type.parseSwagger(api, obj.items, null, false);
                break;
            case "boolean":
                t.type = Kind.BOOLEAN;
                break;
            case "number":
            case "integer":
                t.type = Kind.NUMBER;
                break;
            case "string":
                t.type = Kind.STRING;
                // check for date
                if (obj.format == "date" || obj.format == "date-time") {
                    t.type = Kind.DATE;
                }
                if (obj.format == "binary") {
                    t.type = Kind.FILE;
                }
                break;
            default:
                // maybe void?
                console.error(obj);
                throw new Error("cannot determine type");
        }
        if (obj.enum) {
            if (t.type != Kind.STRING) {
                throw new Error("nema cannot handle enum for non string type");
            }
            t.type = Kind.ENUM;
            t.choices = obj.enum;
        }
        if (obj.$ref) {
            t.referenceModel = obj.$ref;
            t.type = Kind.REFERENCE;
        }
        t.foreignKey = obj["x-nema-fk"] || null;
        if (t.foreignKey && !obj.$ref) {
            t.type = Kind.ID;
        }
        t.readOnly = obj["x-nema-readonly"] || false;
        if (obj["x-nema-control"]) {
            if ("string" === typeof obj["x-nema-control"]) {
                t.control = [obj["x-nema-control"]];
            }
            else if (Array.isArray(obj["x-nema-control"])) {
                t.control = obj["x-nema-control"];
            }
            else {
                console.error(obj);
                throw new Error("invalid x-nema-control type, only string or array");
            }
            if (exports.controls.indexOf(t.control[0]) === -1) {
                console.error(obj);
                throw new Error(`invalid value x-nema-control. Valid: ${exports.controls.join(", ")}`);
            }
        }
        return t;
    }
    /**
     * Returns if the type is a primitive
     */
    isPrimitive() {
        if (this.type == Kind.ARRAY) {
            return this.items.isPrimitive();
        }
        return [Kind.NUMBER, Kind.STRING, Kind.BOOLEAN, Kind.VOID].indexOf(this.type) !== -1;
    }
    /**
     * get base type, only available for array or references.
     */
    toBaseType() {
        switch (this.type) {
            case "enum":
                return this.name;
            case "array":
                return this.items.toBaseType();
        }
        if (this.referenceModel) {
            return (this.api.getReference(this.referenceModel)).name;
        }
        console.error(this);
        throw new Error("???");
    }
    /**
     * Generate typescript code for this type
     */
    toTypeScriptType() {
        // defer to subschema
        if (this.referenceModel) {
            return (this.api.getReference(this.referenceModel)).name;
        }
        if (this.isDefinition) {
            return this.name;
        }
        switch (this.type) {
            case Kind.REFERENCE:
            case Kind.ENUM:
                throw new Error("should not happen");
            case Kind.FILE:
                return "Blob";
            case Kind.BOOLEAN:
                return "boolean";
            case Kind.DATE:
                return "Date";
            case Kind.ID:
            case Kind.STRING:
                return "string";
            case Kind.ARRAY:
                return `${this.items.toTypeScriptType()}[]`;
            case Kind.NUMBER:
                return "number";
            case Kind.OBJECT:
                return "any";
            case Kind.VOID:
                return "void";
            default:
                throw new Error("unhandled type");
        }
    }
    toMongooseType() {
        const d = [];
        switch (this.type) {
            //case FieldType.ObjectId:
            //  d.push(`type: mongoose.Schema.Types.ObjectId`);
            //  break;
            case Kind.OBJECT:
                // type:any
                if (!this.properties) {
                    return `{ type: mongoose.Schema.Types.Mixed }`;
                }
                d.push(`type: Object`);
                const t = [];
                for (const i in this.properties) {
                    if (i != "_id") {
                        t.push(i + ":" + this.properties[i].toMongooseType());
                    }
                }
                if (this.isDefinition == null) {
                    return t.join(",\n");
                }
                d.push(`properties: {${t.join(",\n")}}`);
                break;
            /*
            case FieldType.AutoPrimaryKey:
              d.push(`type: ${FieldType.Number}`);
              break;
      */
            case Kind.ARRAY:
                d.push(`type: Array`);
                d.push(`items: ${this.items.toMongooseType()}`);
                // needed to support array of references
                if (this.items.type == Kind.ID) {
                    d.push(`set: function(v) { return v ? v.map(x => new mongoose.Types.ObjectId(x)) : null; }`);
                }
                break;
            case Kind.DATE:
                d.push(`type: Date`);
                break;
            case Kind.STRING:
                d.push(`type: String`);
                break;
            case Kind.NUMBER:
                d.push(`type: Number`);
                break;
            case Kind.BOOLEAN:
                d.push(`type: Boolean`);
                break;
            case Kind.ENUM:
                d.push(`type: String, enum: ${JSON.stringify(this.choices)}`);
                break;
            case Kind.REFERENCE:
                if (this.foreignKey) {
                    const mdl = this.api.getReference(this.foreignKey);
                    d.push(`type: mongoose.Schema.Types.ObjectId, ref: ${JSON.stringify(mdl.name)}, set: function(v) { return v ? new mongoose.Types.ObjectId(v) : null; }`);
                }
                else {
                    const mdl = this.api.getReference(this.referenceModel);
                    return mdl.type.toMongooseType();
                }
                break;
            case Kind.ID:
                const mdl = this.api.getReference(this.foreignKey);
                d.push(`type: mongoose.Schema.Types.ObjectId, ref: ${JSON.stringify(mdl.name)}, set: function(v) { return v ? new mongoose.Types.ObjectId(v) : null; }`);
                break;
            default:
                d.push(`type: ${this.type}`);
        }
        /*
        // common
        if (this.unique) {
          d.push(`unique: ${this.unique}`);
        }
    
        if (this.defaults !== undefined) {
          d.push(`default: ${JSON.stringify(this.defaults)}`);
        }
    
        if (this.refTo) {
          d.push(`ref: "${this.refTo}"`);
        }
    
        if (this.enums) {
          d.push(`enum: ${JSON.stringify(this.enums)}`);
        }
    
        if (this.required !== false) {
          d.push(`required: ${this.required}`);
        }
        if (this.maxlength !== null) {
          d.push(`maxlength: ${this.maxlength}`);
        }
        if (this.minlength !== null) {
          d.push(`minlength: ${this.minlength}`);
        }
        if (this.min !== null) {
          d.push(`min: ${this.min}`);
        }
        if (this.max !== null) {
          d.push(`max: ${this.max}`);
        }
        if (this.lowercase !== false) {
          d.push(`lowercase: ${this.lowercase}`);
        }
        if (this.uppercase !== false) {
          d.push(`uppercase: ${this.uppercase}`);
        }
        */
        return "{\n" + d.join(",\n") + "\n}";
    }
    /**
     * Get generated code: parse this type given the source variable
     */
    getRandom(ts) {
        switch (this.type) {
            case Kind.REFERENCE:
                return this.api.getReference(this.referenceModel).type.getRandom(ts);
            case Kind.ENUM:
                ts.addImport(this.name, `/src/models/${this.name}.ts`);
                return `${this.name}.${this.choices[0].toUpperCase()}`;
            case Kind.VOID:
            // file is really a Blob and don't need to be casted
            case Kind.FILE:
                return "null";
            case Kind.DATE:
                return "new Date()";
            case Kind.ARRAY:
                // loop through arrays casting it's values
                if (this.items.isPrimitive()) {
                    ts.addImport("Random", `/src/Random.ts`);
                    return `[Random.${this.items.type}(), Random.${this.items.type}()]`;
                }
                return `[${this.items.getRandom(ts)}, ${this.items.getRandom(ts)}]`;
            case Kind.ID:
                return `Random.ObjectId()`;
        }
        if (this.isPrimitive()) {
            // primitive simple casting with null
            ts.addImport("Random", `/src/Random.ts`);
            return `Random.${this.type}()`;
        }
        if (this.isDefinition) {
            // use model.parse
            ts.addImport(this.name, `/src/models/${this.name}.ts`);
            return `${this.name}.randomInstance()`;
        }
        switch (this.type) {
            case "object":
                return "{}"; // equal to any
        }
        console.error(this);
        throw new Error("Not handled");
    }
    /**
     * Get generated code: parse this type given the source variable
     */
    getParser(src, ts) {
        switch (this.type) {
            case Kind.DATE:
                ts.addImport("Cast", `/src/Cast.ts`);
                return `Cast.date(${src})`;
            case Kind.REFERENCE:
                return this.api.getReference(this.referenceModel).type.getParser(src, ts);
            case Kind.VOID:
                return "void(0)";
            case Kind.FILE:
                // file is really a Blob and don't need to be casted
                return src;
            case Kind.ENUM:
                ts.addImport(this.name, `/src/models/${this.name}.ts`);
                //return `${JSON.stringify(this.choices)}.indexOf(${src}) === -1 ? null : ${src}`;
                return `[${this.choices
                    .map((x) => this.name + "." + x.toUpperCase())
                    .join(",")}].indexOf(${src}) === -1 ? null : ${src}`;
            case Kind.ARRAY:
                if (this.items.isPrimitive()) {
                    ts.addImport("Cast", `/src/Cast.ts`);
                    return `(${src} || []).map((x) => Cast.${this.items.type}(x))`;
                }
                //ts.addImport(this.items.toTypeScriptType(), `/src/models/${this.items.toTypeScriptType()}.ts`);
                //return `(${src} || []).map((x) => ${this.items.toTypeScriptType()}.parse(x))`;
                return `(${src} || []).map((x) => ${this.items.getParser("x", ts)})`;
            case Kind.ID:
                return `Cast.string(${src})`;
        }
        if (this.isPrimitive()) {
            // primitive simple casting with null
            ts.addImport("Cast", `/src/Cast.ts`);
            return `Cast.${this.type}(${src})`;
        }
        if (this.isDefinition) {
            ts.addImport(this.name, `/src/models/${this.name}.ts`);
            return `${this.name}.parse(${src})`;
        }
        switch (this.type) {
            case "object":
                return src; // equal to any
        }
        console.error(this);
        throw new Error("Not handled");
    }
    /*
     * Get generated code: empty value
     */
    getEmptyValue() {
        if (this.referenceModel) {
            return this.api.getReference(this.referenceModel).type.getEmptyValue();
        }
        if (this.isDefinition) {
            if (this.type == "enum") {
                return "null";
            }
            return `${this.name}.emptyInstance()`;
        }
        if (this.type == "array") {
            return "[]";
        }
        if (this.isPrimitive() || !this.type || this.type == Kind.FILE || this.type == Kind.DATE || this.type == Kind.ID) {
            return "null";
        }
        // return `${this.toTypeScriptType()}.emptyInstance()`;
        return "{}";
    }
    derefence() {
        if (this.type == Kind.REFERENCE) {
            return this.api.getReference(this.referenceModel).type;
        }
        return this;
    }
}
exports.Type = Type;
//# sourceMappingURL=Type.js.map