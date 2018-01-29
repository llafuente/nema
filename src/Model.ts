import { Api } from "./Api";
import { Type } from "./Type";
import * as _ from "lodash";

export class Model {
  api: Api = null;

  name: string;
  interfaceName: string;
  description: string;
  type: Type;
  extends: string;

  static parse(api: Api, name: string, obj): Model {
    const m = new Model();

    Object.defineProperty(m, "api", { value: api, writable: true, enumerable: false });

    if (obj.allOf) {
       m.extends = obj.allOf[0].$ref.substring("#/definitions/".length);
       obj = obj.allOf[1];
    }

    m.name = name;
    m.interfaceName = `I${name}`;
    m.description = obj.description;
    m.type = Type.parse(obj, obj.schema);

    return m;
  }

  eachProperty(cb: (t: Type, name: string) => void) {
    if (this.type.type !== "object") {
      throw new Error("wtf!?")
    }

    _.each(this.type.properties, cb);
  }

  eachParentProperty(cb: (t: Type, name: string) => void) {
    this.api.models[this.extends].eachProperty(cb);
  }
}
