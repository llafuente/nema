import { Type } from "./Type";
import { Api } from "./Api";

export enum ParameterType {
  PATH,
  QUERY,
  HEADER,
  BODY,
  COOKIE,
  FORM_DATA_FILE,
}

const swaggerToParameterType = {
  path: ParameterType.PATH,
  query: ParameterType.QUERY,
  header: ParameterType.HEADER,
  cookie: ParameterType.COOKIE,
  // NOTE swagger 3 heavely modified this :S
  body: ParameterType.BODY,
  formData: ParameterType.BODY, // except for files -> FORM_DATA_FILE
};

export class Parameter {
  api: Api = null;

  /** variable/real name (no dashes) */
  name: string;
  /** real header name (may contain dashes) */
  headerName: string;
  description: string;
  /** parameter location */
  in: ParameterType;
  required: boolean;

  reference: string;

  /** Is parameter injected by a reverse proxy? do not use as parameter in front */
  autoInjected: boolean;
  type: Type;

  static parseSwagger(api: Api, obj: any): Parameter {
    const p = new Parameter();

    Object.defineProperty(p, "api", { value: api, writable: true, enumerable: false });

    p.name = obj.name;
    p.headerName = obj["x-alias"] || obj["x-nema-header"];
    p.autoInjected = !!obj["x-auto-injected"] || !!obj["x-front-auto-injected"] || !!obj["x-nema-auto-injected"];
    p.description = obj.description;

    if (obj.in == "formData" && obj.type == "file") {
      p.in = ParameterType.FORM_DATA_FILE;
    } else {
      p.in = swaggerToParameterType[obj.in];
    }

    p.required = !!obj.required;

    p.reference = obj.$ref || null;
    // do not parse $ref as type...
    if (p.reference) {
      p.type = null;
    } else {
      p.type = Type.parseSwagger(api, obj.schema || obj, null, false);
    }

    return p;
  }
}
