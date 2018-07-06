import { Api } from "./Api";
import { Parameter, ParameterType } from "./Parameter";
import { Response } from "./Response";
import { Type } from "./Type";
import { OperationObject, ParameterObject, RequestBodyObject } from "openapi3-ts";
import * as _ from "lodash";
import { checkContent, Limitation, Deprecation } from "./utils";
import * as path from "path";

export class Method {
  api: Api = null;
  filename: string = null;
  /**
   * Method relative URL, in the final generation we will append
   * api.frontBasePath or api.basePath
   */
  url: string = null;
  /**
   * Unique name for this operation. Will be used as method/function name
   * in the generators
   */
  operationId: string = null;
  /** http verb: get, post... */
  verb: string = null;
  description: string = null;
  /** List of parameters */
  parameters: Parameter[] = [];
  /** List of responses */
  responses: Response[] = [];

  consumes: string[] = [];
  produces: string[] = [];

  body: {
    encoding: string,
    required: boolean,
    type: Type
  } = null;

  resolve: {
    name: string;
    parameters: { [name: string]: string };
    errorURL: { [name: string]: string };
  } = null;

  static parseOpenApi(
    api: Api,
    verb: string,
    url: string,
    parameters: any[],
    operation: OperationObject,
  ): Method {
    const m = new Method();

    console.info("parsing operation:", verb + ":" + url);

    Object.defineProperty(m, "api", { value: api, writable: true, enumerable: false });

    m.verb = verb.toLowerCase();
    m.url = url;
    if (!operation.operationId) {
      console.error(operation);
      throw new Limitation(`operationId is required at ${api.filename}`);
    }
    m.operationId = operation.operationId;
    m.filename = path.join(api.destinationPath, `src/routes/${operation.operationId}.ts`);
    m.description = operation.description;

    m.parameters = parameters.map((x: ParameterObject) => {
      return Parameter.parseOpenApi(api, x);
    });


    const body = operation.requestBody as RequestBodyObject;
    if (body && body.content) {
      checkContent(body.content, m);
      const k = Object.keys(body.content);
      m.body = {
        encoding: k[0],
        required: !!body.required,
        type: Type.parseSwagger(api, body.content[k[0]].schema, null, false)
      };
    }

    _.each(operation.responses, (response, responseType) => {
      m.responses.push(Response.parseSwagger(api, responseType, response));
    });

    // check no multiple success responses allowed
    let oks = 0;
    let encodings = [];
    m.responses.forEach((response) => {
      if (response.httpCode >= 200 && response.httpCode < 300) {
        ++oks;
      }
      if (response.encoding && encodings.indexOf(response.encoding) === -1) {
        encodings.push(response.encoding);
      }
    });
    if (oks > 1) {
      console.error(operation);
      throw new Limitation(`invalid responses, multiple success responses found at ${api.filename}`);
    }
    if (encodings.length > 1) {
      console.error(m);
      throw new Limitation(`invalid responses, multiple encodings found at ${api.filename}`);
    }

    //end-check

    // TODO check format!
    if (operation["x-front-resolve"]) {
      console.error(m);
      throw new Deprecation(`deprecated usage: x-front-resolve, parsing ${api.filename}`);
    }

    // TODO check format!
    m.resolve = operation["x-nema-resolve"] || null;

    if (operation["x-override-front"]) {
      console.error(m);
      throw new Deprecation(`deprecated usage: x-override-front, parsing ${api.filename}`);
    }

    // very unsafe :) and powerfull ^.^
    _.assign(m, operation["x-nema-override"] || {});

    return m;
  }

  hasBody(): boolean {
     return this.body !== null;
  }

  countParams(filter: ParameterType = null, skipAutoInjected: boolean): number {
    let count = 0;
    for (let p of this.parameters) {
      if (p.reference) {
        p = this.api.getReference(p.reference) as Parameter;
      }

      if ((filter === null || filter === p.in) && !(skipAutoInjected === true && p.autoInjected === true)) {
        ++count;
      }
    }

    return count;
  }
  /**
   * Loop each parameter in "arguments order" resolving any references
   * order: path, header, query, body, file
   */
  eachParam(cb: (p: Parameter) => void) {
    this.eachPathParam(cb);
    this.eachHeaderParam(cb, true);
    this.eachQueryParam(cb);
  }
  /** Loop each parameter of query path resolving any references */
  eachPathParam(cb: (p: Parameter) => void) {
    this.parameters.forEach((p) => {
      if (p.reference) {
        p = this.api.getReference(p.reference) as Parameter;
      }

      if (p.in == ParameterType.PATH) {
        cb(p);
      }
    });
  }
  /** Loop each parameter of query header resolving any references */
  eachQueryParam(cb: (p: Parameter) => void) {
    this.parameters.forEach((p) => {
      if (p.reference) {
        p = this.api.getReference(p.reference) as Parameter;
      }

      if (p.in == ParameterType.QUERY) {
        cb(p);
      }
    });
  }
  /** Loop each parameter of type header resolving any references */
  eachHeaderParam(cb: (p: Parameter) => void, skipAutoInjected) {
    this.parameters.forEach((p) => {
      if (p.reference) {
        p = this.api.getReference(p.reference) as Parameter;
      }

      if (p.in == ParameterType.HEADER && (!skipAutoInjected || (skipAutoInjected && !p.autoInjected))) {
        cb(p);
      }
    });
  }
  /** Loop each parameter of type cookie resolving any references */
  eachCookieParam(cb: (p: Parameter) => void) {
    this.parameters.forEach((p) => {
      if (p.reference) {
        p = this.api.getReference(p.reference) as Parameter;
      }

      if (p.in == ParameterType.COOKIE) {
        cb(p);
      }
    });
  }

  getEnconding() {
    for (let response of this.responses) {
      if (response.encoding) {
        return response.encoding;
      }
    }

    return null;
  }

  /** Get accept header contents */
  getAccept(): string[] {
    return [this.getEnconding()];
  }

  producesJSON(): boolean {
    const enconding = this.getEnconding();
    return enconding && enconding == "application/json";
  }

  producesText(): boolean {
    const enconding = this.getEnconding();
    return enconding && enconding.indexOf("text/") !== -1;
  }

  producesBlob(): boolean {
    return this.getEnconding() != null && !this.producesJSON() && !this.producesText();
  }

  /**
   * returns a response between [200, 300)
   * or returns the default response
   */
  getSuccessResponse(): Response {
    for (const response of this.responses) {
      if (response.httpCode >= 200 && response.httpCode < 300) {
        return response;
      }
    }

    return this.getResponse(0);
  }
  /**
   * returns a the response for given httpCode if found,
   * default response if not.
   */
  getResponse(httpCode: number): Response {
    for (const response of this.responses) {
      if (response.httpCode == httpCode) {
        return response;
      }
    }

    if (httpCode != 0) {
      return this.getResponse(0);
    }

    return null;
  }
  /**
   * Loop each response resolving any reference
   */
  eachResponse(cb: (response: Response) => void) {
    _.each(this.responses, (response) => {
      if (response.reference) {
        // create a new one, http from here, the rest from the reference
        const r = new Response();
        _.assign(r, this.api.getReference(response.reference) as Response);
        r.httpCode = response.httpCode;
        cb(r);
      } else {
        cb(response);
      }
    });
  }
}
