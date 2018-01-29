import { Type } from "./Type";

export enum ParameterType {
  PATH,
  QUERY,
  HEADER,
  BODY,
  COOKIE,
};

const SwaggerToParameterType = {
  "path": ParameterType.PATH,
  "query": ParameterType.QUERY,
  "header": ParameterType.HEADER,
  "cookie": ParameterType.COOKIE,
  // NOTE swagger 3 heavely modified this :S
  "body": ParameterType.BODY,
};

export class Parameter {
  name: string; // variable/real name (no dashes)
  headerName: string; // real header name (may contain dashes)
  description: string;
  in: ParameterType;
  required: boolean;
  autoInjected: boolean; // parameter injected by a proxy
  type: Type;

  static parse(obj: any): Parameter {
    //console.log("Parameter.parse", obj);

    const p = new Parameter();
    p.name = obj.name;
    p.headerName = obj["x-alias"];
    p.autoInjected = !!obj["x-auto-injected"];
    p.description = obj.description;
    p.in = SwaggerToParameterType[obj.in]
    p.required = !!obj.required;
    p.type = Type.parse(obj.schema || obj);

    return p;
  }
}
