"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
exports.Models = {};
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
    }
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
        if (obj.type) {
            t.type = obj.type.toLocaleLowerCase();
        }
        else {
            t.type = "void";
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
            t.type = "reference";
            t.foreignKey = obj["x-nema-fk"] || null;
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
        console.error(this);
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
        if (this.isDefinition) {
            return this.name;
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
            case "object":
                return "any";
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
                // type:any
                if (!this.properties) {
                    return `{ type: mongoose.Schema.Types.Mixed }`;
                }
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
            case "boolean":
                d.push(`type: Boolean`);
                break;
            case "enum":
                d.push(`type: String, enum: ${JSON.stringify(this.choices)}`);
                break;
            case "reference":
                if (this.foreignKey) {
                    d.push(`type: mongoose.Schema.Types.ObjectId, ref: ${JSON.stringify(this.foreignKey)}`);
                }
                else {
                    const m = this.api.getReference(this.referenceModel);
                    return m.type.toMongooseType();
                }
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
            case "reference":
                return this.api.getReference(this.referenceModel).type.getRandom(ts);
            case "enum":
                ts.addImport(this.name, `/src/models/${this.name}.ts`);
                return `${this.name}.${this.choices[0].toUpperCase()}`;
            case "void":
            // file is really a Blob and don't need to be casted
            case "file":
                return "null";
            case "array":
                // loop through arrays casting it's values
                if (this.items.isPrimitive()) {
                    ts.addImport("Random", `/src/Random.ts`);
                    return `[Random.${this.items.type}(), Random.${this.items.type}()]`;
                }
                return `[${this.items.getRandom(ts)}, ${this.items.getRandom(ts)}]`;
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
            case "reference":
                return this.api.getReference(this.referenceModel).type.getParser(src, ts);
            case "void":
                return "void(0)";
            case "file":
                // file is really a Blob and don't need to be casted
                return src;
            case "enum":
                ts.addImport(this.name, `/src/models/${this.name}.ts`);
                //return `${JSON.stringify(this.choices)}.indexOf(${src}) === -1 ? null : ${src}`;
                return `[${this.choices.map((x) => this.name + "." + x.toUpperCase()).join(",")}].indexOf(${src}) === -1 ? null : ${src}`;
            case "array":
                if (this.items.isPrimitive()) {
                    ts.addImport("Cast", `/src/Cast.ts`);
                    return `(${src} || []).map((x) => Cast.${this.items.type}(x))`;
                }
                //ts.addImport(this.items.toTypeScriptType(), `/src/models/${this.items.toTypeScriptType()}.ts`);
                //return `(${src} || []).map((x) => ${this.items.toTypeScriptType()}.parse(x))`;
                return `(${src} || []).map((x) => ${this.items.getParser("x", ts)})`;
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
        if (this.isPrimitive() || !this.type || this.type == "file") {
            return "null";
        }
        // return `${this.toTypeScriptType()}.emptyInstance()`;
        return "{}";
    }
}
exports.Type = Type;
//# sourceMappingURL=Type.js.map