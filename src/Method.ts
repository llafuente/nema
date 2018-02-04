import { Api } from "./Api";
import { Type } from "./Type";
import { Parameter, ParameterType } from "./Parameter";
import { Response } from "./Response";
import * as _ from "lodash";

export class Method {
  api: Api = null;
  /*
   * Method relative URL, in the final generation we will append api.frontBasePath or api.basePath
   */
  url: string = null;
  operationId: string = null;
  verb: string = null;
  description: string = null;
  parameters: Parameter[] = [];
  responses: Response[] = [];

  consumes: string[] = [];
  produces: string[] = [];

  resolve: {
    name: string,
    parameters: {[name: string]: string},
    errorURL: {[name: string]: string},
  } = null;

  static parseSwagger(
    api: Api,
    verb: string,
    url:string,
    parameters: any[],
    consumes: string[],
    produces: string[],
    method: any
  ): Method{
    const m = new Method();

    Object.defineProperty(m, "api", { value: api, writable: true, enumerable: false });

    m.verb = verb.toLowerCase();
    m.url = url;
    if (!method.operationId) {
      console.log(method);
      throw new Error(`operationId is required at ${api.filename}`);
    }
    m.operationId = method.operationId;
    m.description = method.description;
    m.consumes = consumes;
    m.produces = produces;

    m.parameters = parameters.map((x) => {
      return Parameter.parseSwagger(x);
    });

    // Keep compat with our legacy generator
    // this is out of the swagger standard, sry
    if (Array.isArray(method.responses)) {
      const responses = {};
      method.responses.forEach((r) => {
        _.each(r, (response, httpCode) => {
          responses[httpCode] = response;
        });
      });
      method.responses = responses;
    }

    _.each(method.responses, (response, responseType) => {
      m.responses.push(Response.parseSwagger(responseType, response))
    });

    // check no multiple success responses allowed
    let oks = 0;
    m.responses.forEach((response) => {
      if (response.httpCode >= 200 && response.httpCode < 300) {
        ++oks;
      }
    });
    if (oks > 1) {
      console.log(method);
      throw new Error(`invalid responses, multiple success responses found at ${api.filename}`)
    }
    //end-check


    // TODO check format!
    if (method["x-front-resolve"]) {
      console.warn(`deprecated usage: x-front-resolve, parsing ${api.filename}`);
    }

    m.resolve = method["x-front-resolve"] || method["x-nema-resolve"] || null;

    if (method["x-override-front"]) {
      console.warn(`deprecated usage: x-override-front, parsing ${api.filename}`);
    }

    // very unsafe :)
    const override = method["x-override-front"] || method["x-nema-override"] || {};
    _.assign(m, override);

    return m;
  }

  countParams(filter: ParameterType = null, skipAutoInjected: boolean): number {
    let count = 0;
    for (let p of this.parameters) {
      if ((filter === null || filter === p.in) && !(skipAutoInjected === true && p.autoInjected === true)) {
        ++count;
      }
    }

    return count;
  }

  eachParam(cb: (p:Parameter) => void) {
    this.eachPathParam(cb);
    this.eachHeaderParam(cb, true);
    this.eachQueryParam(cb);
    this.eachBodyParam(cb);
  }

  eachPathParam(cb: (p:Parameter) => void) {
    this.parameters.forEach((p) => {
      if (p.in == ParameterType.PATH) {
        cb(p);
      }
    })
  }

  eachQueryParam(cb: (p:Parameter) => void) {
    this.parameters.forEach((p) => {
      if (p.in == ParameterType.QUERY) {
        cb(p);
      }
    })
  }

  eachHeaderParam(cb: (p:Parameter) => void, skipAutoInjected) {
    this.parameters.forEach((p) => {
      if (p.in == ParameterType.HEADER && (!skipAutoInjected || (skipAutoInjected && !p.autoInjected))) {
        cb(p);
      }
    })
  }

  eachCookieParam(cb: (p:Parameter) => void) {
    this.parameters.forEach((p) => {
      if (p.in == ParameterType.COOKIE) {
        cb(p);
      }
    })
  }

  eachBodyParam(cb: (p:Parameter) => void) {
    this.parameters.forEach((p) => {
      if (p.in == ParameterType.BODY) {
        cb(p);
      }
    })
  }

  producesJSON(): boolean {
    return this.produces.indexOf("application/json") !== -1;
  }

  producesText(): boolean {
    return this.produces.indexOf("text/plain") !== -1 || this.produces.indexOf("text/html") !== -1;
  }

  producesBlob(): boolean {
    return this.produces.some((produce) => {
      return produce.indexOf("image/") == 0
    });
  }

  requireBody() {
    return ["post", "patch", "put"].indexOf(this.verb) !== -1;
  }

  getSuccessResponse(): Response {
    for (let response of this.responses) {
      if (response.httpCode >= 200 && response.httpCode < 300) {
        return response;
      }
    }

    return this.getResponse(0);
  }

  getResponse(httpCode: number): Response {
    for (let response of this.responses) {
      if (response.httpCode == httpCode) {
        return response;
      }
    }

    if (httpCode != 0) {
      return this.getResponse(0);
    }

    return null;
  }
}
