import { Type } from "./Type";
import { Api } from "./Api";
import { checkContent } from "./utils";

export class Response {
  /**
   * Response http status code
   * 0 means any other case aka swagger "default"
   */
  httpCode: number;
  description: string;
  type: Type;
  reference: string;
  encoding: string;

  static parseSwagger(api: Api, httpCode, obj): Response {
    console.log(obj);

    const r = new Response();

    r.httpCode = httpCode == "default" ? 0 : parseInt(httpCode, 10);

    if (obj.$ref) {
      r.reference = obj.$ref;
    } else {
      r.description = obj.description;
      const c = obj.content;
      if (c) {
        const c2 = checkContent(c, obj);
        const k = Object.keys(c);

        r.encoding = k[0];
        r.type = Type.parseSwagger(api, c[k[0]].schema, null, false)
      } else {
        r.type = Type.void();
      }
    }

    return r;
  }
}
