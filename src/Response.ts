import { Type } from "./Type";
import { Api } from "./Api";

export class Response {
  /**
   * Response http status code
   * 0 means any other case aka swagger "default"
   */
  httpCode: number;
  description: string;
  type: Type;
  reference: string;

  static parseSwagger(api: Api, httpCode, obj): Response {
    const r = new Response();

    r.httpCode = httpCode == "default" ? 0 : parseInt(httpCode, 10);

    if (obj.$ref) {
      r.reference = obj.$ref;
    } else {
      r.description = obj.description;
      r.type = Type.parseSwagger(api, obj.schema || obj, null, false);
    }

    return r;
  }
}
