import * as _ from "lodash";

export const Models: {[name: string]: Type} = {};

export class Type {
  type: string = null;
  description: string = undefined;
  /**
   * Object properties
   */
  properties?: {[name: string]: Type} = undefined;
  /**
   * Array sub type
   */
  items?: Type = undefined;
  /**
   * reference to another model
   */
  referenceModel?: string = undefined;
  /**
   * parse type from swagger
   */
  static parseSwagger(obj, modelName: string = null): Type {
    const t = new Type();

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
    if (obj.type) {
      t.type = obj.type.toLocaleLowerCase();
    }
    t.description = obj.description;


    if (t.type == "object") {
      t.properties = _.mapValues(obj.properties, (x) => {
        return Type.parseSwagger(x);
      });
    }

    if (t.type == "array") {
      t.items = Type.parseSwagger(obj.items);
    }

    if (obj.$ref) {
      t.referenceModel = obj.$ref.substring("#/definitions/".length);
    }

    if (modelName) {
      if (Models[modelName]) {
        throw new Error("Model redefinition: ${modelName}");
      }

      Models[modelName] = t;
    }

    return t;
  }
  /**
   * Returns if the type is a primitive
   */
  isPrimitive(): boolean {
    if (this.type == "array") {
      return this.items.isPrimitive();
    }

    return ["integer", "string", "boolean", "number"].indexOf(this.type) !== -1;
  }
  /**
   * get base type, only available for array or references.
   */
  toBaseType(): string {
    switch (this.type) {
    case "array":
      return this.items.toBaseType();
    }

    if (this.referenceModel) {
      return this.referenceModel;
    }

    throw new Error("???");
  }

  /**
   * Generate typescript code for this type
   */
  toTypeScriptType(): string {
    // defer to subschema
    if (this.referenceModel) {
      return this.referenceModel;
      //return Models[this.referenceModel].toTypeScriptType();
    }

    switch (this.type) {
      case "file":
        return "Blob";
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

  /**
   * Get generated code: parse this type given the source variable
   */
  getParser(src) {
    // file is really a Blob and don't need to be casted
    if (this.type == "file") {
      return src;
    }

    // loop through arrays casting it's values
    if (this.type == "array") {
      if (this.items.isPrimitive()) {
        return `(${src} || []).map((x) => Cast.${this.items.type}(x))`;
      } else {
        return `(${src} || []).map((x) => ${this.items.toTypeScriptType()}.parse(x))`;
      }
    } else if (this.isPrimitive()) {
      // primitive simple casting with null
      return `Cast.${this.type}(${src})`;
    }

    // use model.parse
    return `${this.toTypeScriptType()}.parse(${src})`;
  }
  /*
   * Get generated code: empty value
   */
  getEmptyValue(): string {
    if (this.type == "array") {
      return "[]";
    }
    if (this.isPrimitive() || !this.type) {
      return "null";
    }
    return "{}";
  }
}
