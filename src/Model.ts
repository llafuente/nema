import { Api } from "./Api";
import { Type } from "./Type";
import * as _ from "lodash";
import * as pluralize from "pluralize";

export class Model {
  api: Api = null;

  name: string;
  filename: string;
  description: string;
  type: Type;
  /*
   * Name of the parent model
   */
  extends: string;


  //dtoName: string;
  /**
   * Autogenerated
   */
  interfaceName: string;
  /**
   * Autogenerated
   */
  mongooseInterface: string;
  /**
   * Autogenerated
   */
  mongooseModel: string;
  /**
   * Autogenerated
   */
  mongooseSchema: string;
  /**
   * Autogenerated
   */
  mongooseRepository: string;
  /**
   * Autogenerated
   */
  mongooseCollection: string;

  static parseSwagger(api: Api, name: string, obj): Model {
    const m = new Model();

    Object.defineProperty(m, "api", { value: api, writable: true, enumerable: false });

    if (obj.allOf) {
       m.extends = obj.allOf[0].$ref;
       obj = obj.allOf[1];
    }

    m.name = name;
    m.filename = `/src/models/${name}.ts`;

    // this need review, i'm +1 , but also see unforseen consecuences
    // remove Dto from name
    //if (m.name.substr(m.name.length -3).toLowerCase() == "dto") {
    //  m.name = m.name.substr(0, m.name.length -3);
    //}

    m.type = Type.parseSwagger(api, obj, name, true);
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

  eachProperty(cb: (t: Type, name: string) => void) {
    if (this.type.type !== "object") {
      console.error(this);
      throw new Error("wtf!?")
    }

    _.each(this.type.properties, cb);
  }

  eachParentProperty(cb: (t: Type, name: string) => void) {
    const m = this.api.getReference(this.extends) as Model;
    m.eachProperty(cb);
  }

  isEnum(): boolean {
    return this.type.type == "enum";
  }
}
