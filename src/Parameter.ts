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
  /**
   * variable/real name (no dashes)
   */
  name: string;
  /**
   * real header name (may contain dashes)
   */
  headerName: string;
  description: string;
  in: ParameterType;
  required: boolean;
  /*
   * Is parameter injected by a proxy
   */
  autoInjected: boolean;
  type: Type;

  static parseSwagger(obj: any): Parameter {
    const p = new Parameter();
    p.name = obj.name;
    p.headerName = obj["x-alias"] || obj["x-nema-header"];
    p.autoInjected = !!obj["x-auto-injected"] || !!obj["x-front-auto-injected"] || !!obj["x-nema-auto-injected"];
    p.description = obj.description;
    p.in = SwaggerToParameterType[obj.in]
    p.required = !!obj.required;
    p.type = Type.parseSwagger(obj.schema || obj, null, false);

    return p;
  }
}
