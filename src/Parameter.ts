import { Type } from "./Type";
import { Api } from "./Api";
import { camelcase } from "./utils";

export enum ParameterType {
  PATH = "path",
  QUERY = "query",
  HEADER = "header",
  BODY = "body",
  COOKIE = "cookie",
  FORM_DATA_FILE = "file",
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

const varNameRE = new RegExp("^[^a-zA-Z_]+|[^a-zA-Z_0-9]+", "g");

export class Parameter {
  api: Api = null;

  /** variable/real name (no dashes) */
  name: string = null;
  /** real header name (may contain dashes) */
  headerName: string = null;
  description: string = null;
  /** parameter location */
  in: ParameterType = null;
  required: boolean = false;

  reference: string = null;

  /** Is parameter injected by a reverse proxy? do not use as parameter in front */
  autoInjected: boolean;
  type: Type = null;
  /**
   * documentation: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#parameterObject
   */
  static parseSwagger(api: Api, obj: any): Parameter {
    const p = new Parameter();

    Object.defineProperty(p, "api", { value: api, writable: true, enumerable: false });


    p.required = !!obj.required;

    p.reference = obj.$ref || null;
    // $ref do not need anything more to parse
    if (!p.reference) {
      if (!obj.name) {
        console.error(obj);
        throw new Error("ParameterObject.name is required");
      }
      if (!obj.in) {
        console.error(obj);
        throw new Error("ParameterObject.in is required");
      }

      p.name = obj.name.replace(varNameRE, "_");
      p.headerName = obj.name;

      if (p.name != p.headerName) {
        p.name = camelcase(p.name);
      }

      // NOTE: x-nema-header was removed only legacy behaviour
      if (obj["x-alias"]) {
        p.name = obj.name; // name must be valid in this case!
        p.headerName = obj["x-alias"];
      }

      if (obj.in == "formData" && obj.type == "file") {
        p.in = ParameterType.FORM_DATA_FILE;
      } else {
        p.in = swaggerToParameterType[obj.in];
      }

      if (obj.in == "body") {
        // force schema to be used when body
        p.type = Type.parseSwagger(api, obj.schema, null, false);
      } else {
        p.type = Type.parseSwagger(api, obj.schema || obj, null, false);
      }

      p.description = obj.description;
      p.autoInjected = !!obj["x-auto-injected"] || !!obj["x-front-auto-injected"] || !!obj["x-nema-auto-injected"];
    }

    return p;
  }
}
