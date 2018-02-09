"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
exports.Models = {};
class Type {
    constructor() {
        this.api = null;
        this.type = null;
        this.description = undefined;
        this.isDefinition = undefined;
        /**
         * Object properties
         */
        this.properties = undefined;
        /**
         * Array sub type
         */
        this.items = undefined;
        /**
         * Enum choices
         */
        this.choices = undefined;
        /**
         * Reference to another model
         */
        this.referenceModel = undefined;
    }
    //getName(): string {
    //  if (this.referenceModel) {
    //    const t = this.api.getReference(this.referenceModel);
    //  }
    //}
    /**
     * Parse type from swagger
     */
    static parseSwagger(api, obj, modelName, isDefinition) {
        const t = new Type();
        Object.defineProperty(t, "api", { value: api, writable: true, enumerable: false });
        t.name = modelName;
        t.isDefinition = isDefinition;
        obj = obj || { type: "void" };
        // sanity checks
        if (!modelName && obj.type == "object" && !obj.properties) {
            console.log(obj);
            throw new Error("Object need to be in definitions at first level");
        }
        if (obj.type == "object" && !obj.properties) {
            console.log(modelName, obj);
            throw new Error("missing type.properties");
        }
        if (obj.type == "array" && !obj.items) {
            console.log(modelName, obj);
            throw new Error("missing type.items");
        }
        if (obj.type && obj.$ref) {
            console.log(modelName, obj);
            throw new Error("type has type and reference");
        }
        if (!isDefinition && obj.enum) {
            console.log(obj);
            throw new Error("enum need to be in definitions at first level");
        }
        if (obj.type) {
            t.type = obj.type.toLocaleLowerCase();
        }
        t.description = obj.description;
        if (obj.enum) {
            t.type = "enum";
            t.choices = obj.enum;
        }
        if (t.type == "object") {
            t.properties = _.mapValues(obj.properties, (x) => {
                return Type.parseSwagger(api, x, null, false);
            });
        }
        if (t.type == "array") {
            t.items = Type.parseSwagger(api, obj.items, null, false);
        }
        if (obj.$ref) {
            t.referenceModel = obj.$ref;
        }
        if (modelName) {
            if (exports.Models[modelName]) {
                throw new Error("Model redefinition: ${modelName}");
            }
            exports.Models[modelName] = t;
        }
        return t;
    }
    /**
     * Returns if the type is a primitive
     */
    isPrimitive() {
        if (this.type == "array") {
            return this.items.isPrimitive();
        }
        return ["integer", "string", "boolean", "number", "void"].indexOf(this.type) !== -1;
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
            return this.api.getReference(this.referenceModel).name;
        }
        console.log(this);
        throw new Error("???");
    }
    /**
     * Generate typescript code for this type
     */
    toTypeScriptType() {
        // defer to subschema
        if (this.referenceModel) {
            return this.api.getReference(this.referenceModel).name;
        }
        switch (this.type) {
            case "file":
                return "Blob";
            case "string":
                return "string";
            case "array":
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
    toMongooseType() {
        const d = [];
        switch (this.type) {
            //case FieldType.ObjectId:
            //  d.push(`type: mongoose.Schema.Types.ObjectId`);
            //  break;
            case "object":
                d.push(`type: Object`);
                const t = [];
                for (const i in this.properties) {
                    t.push(i + ":" + this.properties[i].toMongooseType());
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
            case "array":
                d.push(`type: Array`);
                d.push(`items: ${this.items.toMongooseType()}`);
                break;
            case "string":
                d.push(`type: String`);
                break;
            case "integer":
            case "number":
                d.push(`type: Number`);
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
        // file is really a Blob and don't need to be casted
        if (this.type == "file") {
            return "null";
        }
        // loop through arrays casting it's values
        if (this.type == "array") {
            if (this.items.isPrimitive()) {
                ts.addImport("Random", `./src/Random`);
                return `Array(2).map((x) => Random.${this.items.type}(x))`;
            }
            ts.addImport(this.items.toBaseType(), `./src/models/${this.items.toBaseType()}`);
            return `Array(2).map((x) => ${this.items.toTypeScriptType()}.randomInstance())`;
        }
        if (this.isPrimitive()) {
            // primitive simple casting with null
            ts.addImport("Random", `./src/Random`);
            return `Random.${this.type}()`;
        }
        // use model.parse
        ts.addImport(this.toTypeScriptType(), `./src/models/${this.toTypeScriptType()}`);
        return `${this.toTypeScriptType()}.randomInstance()`;
    }
    /**
     * Get generated code: parse this type given the source variable
     */
    getParser(src, ts) {
        // file is really a Blob and don't need to be casted
        if (this.type == "file") {
            return src;
        }
        // loop through arrays casting it's values
        if (this.type == "array") {
            if (this.items.isPrimitive()) {
                ts.addImport("Cast", `./src/Cast`);
                return `(${src} || []).map((x) => Cast.${this.items.type}(x))`;
            }
            ts.addImport(this.items.toTypeScriptType(), `./src/models/${this.items.toTypeScriptType()}`);
            return `(${src} || []).map((x) => ${this.items.toTypeScriptType()}.parse(x))`;
        }
        if (this.isPrimitive()) {
            // primitive simple casting with null
            ts.addImport("Cast", `./src/Cast`);
            return `Cast.${this.type}(${src})`;
        }
        if (!this.type && !this.referenceModel) {
            return "void(0)";
        }
        // use model.parse
        ts.addImport(this.toTypeScriptType(), `./src/models/${this.toTypeScriptType()}`);
        return `${this.toTypeScriptType()}.parse(${src})`;
    }
    /*
     * Get generated code: empty value
     */
    getEmptyValue() {
        if (this.type == "array") {
            return "[]";
        }
        if (this.isPrimitive() || !this.type) {
            return "null";
        }
        return "{}";
    }
}
exports.Type = Type;
//# sourceMappingURL=Type.js.map