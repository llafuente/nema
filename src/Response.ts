import { Type } from "./Type";

export class Response {
  // 0 means any other case aka swagger "default"
  httpCode: number;
  description: string;
  type: Type;

  static parse(httpCode, obj): Response {
    const r = new Response();

    r.httpCode = httpCode == "default" ? 0 : parseInt(httpCode, 10);
    r.description = obj.description;
    r.type = Type.parse(obj.schema || obj);

    return r;
  }
}
