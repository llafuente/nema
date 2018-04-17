import { Api } from "./Api";
import { Type, Kind } from "./Type";
import * as _ from "lodash";
import * as pluralize from "pluralize";

export class Model {
  api: Api = null;
  /** type is internal, not really defined by user but used by it */
  internal: boolean = false;
  /** Mark model to be exported as database/collection */
  isDb: boolean = false;

  name: string;
  namePlural: string;
  /** destination full path */
  filename: string;
  description: string;
  type: Type;
  /** Name of the parent model */
  extends: string;
  /** Autogenerated */
  interfaceName: string;
  /** Autogenerated */
  mongooseInterface: string;
  /** Autogenerated */
  mongooseModel: string;
  /** Autogenerated */
  mongooseSchema: string;
  /** Autogenerated */
  mongooseRepository: string;
  /** Autogenerated */
  mongooseCollection: string;

  static parseSwagger(api: Api, name: string, obj: any): Model {
    const m = new Model();

    Object.defineProperty(m, "api", { value: api, writable: true, enumerable: false });

    if (obj.allOf) {
      m.extends = obj.allOf[0].$ref;
      obj = obj.allOf[1];
    }

    m.name = name;
    m.namePlural = obj["x-nema-plural"] || pluralize.plural(name.toLowerCase());
    m.filename = `/src/models/${name}.ts`;

    m.isDb = !!obj["x-nema-db"];

    // force: naming convention
    // this need review, i'm +1 , but also see unforseen consecuences
    // remove Dto from name
    // if (m.name.substr(m.name.length -3).toLowerCase() == "dto") {
    //   m.name = m.name.substr(0, m.name.length -3);
    // }

    m.type = Type.parseSwagger(api, obj, name, true);

    if (m.isDb) {
      if (m.type.type != "object") {
        console.error(obj);
        throw new Error("Only type: object can use x-nema-db");
      }

      // declare _id as any and place it first
      const _id = new Type();
      _id.type = Kind.OBJECT;
      const p = m.type.properties;
      m.type.properties = {
        _id,
      };

      for (const i in p) {
        m.type.properties[i] = p[i];
      }
    }

    m.description = obj.description;

    //m.dtoName = `${name}Dto`;
    m.interfaceName = `I${name}`;
    m.mongooseInterface = `I${name}Model`;
    m.mongooseSchema = `${name}Schema`;
    m.mongooseRepository = `${name}Repository`;
    m.mongooseModel = `${name}Model`;
    m.mongooseCollection = pluralize.plural(name.toLowerCase());

    return m;
  }

  eachProperty(cb: (t: Type, name: string) => void) {
    if (this.type.type !== "object") {
      console.error(this);
      throw new Error("wtf!?");
    }

    _.each(this.type.properties, cb);
  }

  eachParentProperty(cb: (t: Type, name: string) => void) {
    if (!this.extends) {
      console.error(this);
      throw new Error("This model has no parent model");
    }

    const m = this.api.getReference(this.extends) as Model;
    m.eachProperty(cb);
  }

  isEnum(): boolean {
    return this.type.type == "enum";
  }
}
