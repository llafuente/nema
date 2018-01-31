import { Type } from "./Type";

export class Response {
  /**
   * Response http status code
   * 0 means any other case aka swagger "default"
   */
  httpCode: number;
  description: string;
  type: Type;

  static parseSwagger(httpCode, obj): Response {
    const r = new Response();

    r.httpCode = httpCode == "default" ? 0 : parseInt(httpCode, 10);
    r.description = obj.description;
    r.type = Type.parseSwagger(obj.schema || obj);

    return r;
  }
}
