import * as _ from "lodash";

export const Models: {[name: string]: Type} = {};

export class Type {
  type: string;
  description: string = undefined;
  properties?: {[name: string]: Type} = undefined;
  items?: Type = undefined;
  referenceModel?: string = undefined;

  static parse(obj, modelName: string = null): Type {
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
      if (Models[modelName]) {
        throw new Error("Model redefinition: ${modelName}");
      }

      Models[modelName] = t;
    }

    return t;
  }

  isPrimitive(): boolean {
    if (this.type == "array") {
      return this.items.isPrimitive();
    }

    return ["integer", "string", "boolean", "number"].indexOf(this.type) !== -1;
  }

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

  toTypeScriptType(): string {
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

  /**
   * Get generated code: parse this type given the source variable
   */
  getParser(src) {
    if (this.type == "array") {
      if (this.items.isPrimitive()) {
        return `(${src} || []).map((x) => Cast.${this.items.type}(x))`;
      } else {
        return `(${src} || []).map((x) => ${this.items.toTypeScriptType()}.parse(x))`;
      }
    } else if (this.isPrimitive()) {
      return `Cast.${this.type}(${src})`;
    }

    // model
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
