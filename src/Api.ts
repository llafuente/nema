import * as fs from "fs";
import * as _ from "lodash";
import * as path from "path";

import { Method } from "./Method";
import { Model } from "./Model";
import { Parameter } from "./Parameter";
import { Response } from "./Response";

import { ksort, Requirement, Limitation } from "./utils";

import { OpenAPIObject, PathItemObject, ResponseObject, ParameterObject, OperationObject } from "openapi3-ts";

export interface License {
  name: string;
  url?: string;
}

export interface Contact {
  name: string;
  url: string;
  email: string;
}

export interface Info {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: Contact;
  license?: License;
  version: string;
}

/**
 * Api definicion class
 */
export class Api {
  /** source file filename */
  filename: string;
  /** Swagger contents atm */
  originalSource: any;
  /** Path to API */
  destinationPath: string;

  info: Info;

  /** Angular ngModule name */
  angularClientModuleName: string;
  /** Angular node module name */
  angularClientNodeModuleName: string;
  /** Angular class name */
  apiName: string;
  /** Api version */
  version: string;
  /** Api description */
  description: string;
  /** Scheme list */
  servers: {url: string}[];
  /** Hosts */
  serves: {url: string};
  /**
   * Path for front applications, may not be the same because reverse-proxies could be
   * in the middle
   */
  frontBasePath: string = "/";

  authorName: string;
  authorEmail: string;
  authorURL: string;

  methods: { [name: string]: Method } = {};
  /**
   * references: #/definitions/XXXX
   */
  models: { [name: string]: Model } = {};
  /**
   * This is just a special place for enums, to keep it separate from
   * other models because has no "class.parse"
   *
   * references: #/definitions/XXXX
   */
  enums: { [name: string]: Model } = {};
  /**
   * references: #/parameters/XXXX
   */
  parameters: { [name: string]: Parameter } = {};
  /**
   * references: #/responses/XXXX
   */
  responses: { [name: string]: Response } = {};

  root: string;

  security: {
    name: string,
    headerName: string,
    type: string
  } = null;

  constructor() {
    // two levels when executed as JS
    this.root = path.join(__dirname, "..", "..");
  }


  static parseOpenApi(filename: string, dstPath: string, swagger: OpenAPIObject): Api {
    const api = new Api();

    api.filename = filename;
    api.destinationPath = dstPath;
    Object.defineProperty(api, "originalSource", { value: swagger, writable: true, enumerable: false });

    if (swagger["x-nema"]) {
      api.apiName = "" + swagger["x-nema"].apiName;
      api.angularClientNodeModuleName = "" + swagger["x-nema"].angularClientNodeModuleName;
      api.angularClientModuleName = "" + swagger["x-nema"].angularClientModuleName;
      api.frontBasePath = "" + (swagger["x-nema"].frontBasePath || "/");
    }

    if (!api.apiName) {
      console.warn(`apiName not defined, using Api: x-nema.apiName at ${filename}`);
      api.apiName = "Api";
    }
    if (!api.angularClientNodeModuleName) {
      console.warn(
        `angularClientNodeModuleName not defined, using api-module: x-nema.angularClientNodeModuleName at ${filename}`,
      );
      api.angularClientNodeModuleName = "api-module";
    }
    if (!api.angularClientModuleName) {
      console.warn(
        `angularClientModuleName not defined, using ApiModule: x-nema.angularClientModuleName at ${filename}`,
      );
      api.angularClientModuleName = "ApiModule";
    }

    api.servers = swagger.servers;
    // for (let server of swagger.servers) {
    //   if (server.url[0] == "/") {
    //     console.info(`using: ${server.url} as basePath`);
    //     api.basePath = server.url
    //   }
    // }

    api.servers = swagger.servers;
    if (!api.servers || !api.servers.length) {
      throw new Requirement(
        `Swagger: host, basePath and schemes is required at ${filename}\n` +
        `OpenApi: #/components/servers is required at ${filename}`
      );
    }

    // TODO remove this and use it directly!!
    const info: Info = swagger.info || ({} as any);
    const contact: Contact = info.contact || ({} as any);

    api.version = info.version || "";
    api.description = info.description || "";
    api.authorName = contact.name || "";
    api.authorEmail = contact.email || "";
    api.authorURL = contact.url || "";

    api.parseSwaggerDefinitions(swagger, false);

    _.each(swagger.components.parameters, (param: ParameterObject, paramName) => {
      api.parameters[paramName] = Parameter.parseOpenApi(api, param);
    });

    _.each(swagger.components.responses, (param: ResponseObject, paramName) => {
      api.responses[paramName] = Response.parseSwagger(api, null, param);
    });

    const k = Object.keys(swagger.components.securitySchemes || {});
    if (k.length > 1) {
      throw new Limitation("Only one securitySchemes is allowed");
    } else if (k.length == 1) {

      // this may evolve in the future, right now only one implementation
      // is allowed
      const security = swagger.components.securitySchemes[k[0]];

      if (security.type !== 'apiKey') {
        throw new Limitation("apiKey is the only security.type allowed");
      }

      if (security.in !== 'header') {
        throw new Limitation("header is the only security.in type allowed");
      }

      if (security['x-nema-security'] !== 'JWT') {
        throw new Limitation("security.x-nema-security must be JWT");
      }

      api.security = {
        name: k[0],
        headerName: security.name,
        type: "jwt",
      };
    }

    _.each(swagger.paths, (pathItem: PathItemObject, uri) => {
      if (["/api-ui"].indexOf(uri) !== -1) {
        throw new Limitation(`forbidden API uri: ${uri}`);
      }

      ["get", "put", "post", "delete", "options", "head", "patch", "trace"].forEach((verb) => {
        const method: OperationObject = pathItem[verb];

        if (method) {
          // console.log("parsing: ", method.operationId, JSON.stringify(method, null, 2));
          api.addMethod(
            Method.parseOpenApi(
              api,
              verb,
              uri,
              (method.parameters || []).concat(pathItem.parameters).filter((x) => x != null),
              method,
            ),
            false,
          );
        }
      });
    });

    return api;
  }

  /**
   * @internal used to declare blacklisted models
   */
  parseSwaggerDefinitions(swagger: any, internal: boolean) {
    _.each((swagger.components || {}).schemas, (model, name) => {
      const mdl = Model.parseSwagger(this, name, model);
      mdl.internal = internal;

      if (mdl.isEnum()) {
        this.addEnum(mdl, false);
      } else {
        this.addModel(mdl, false);
      }
    });

    _.each(swagger.parameters, (param, paramName) => {
      this.parameters[paramName] = Parameter.parseOpenApi(this, param);
    });
  }

  /**
   * @internal used to declare blacklisted models
   */
  addModel(model: Model, override: boolean) {
    if (!model.internal) {

      //console.log(`addModel: ${model.name}`);
      if (!override && this.models[model.name] !== undefined) {
        throw new Error(
          `try to override an already defined model: ${model.name} from ${this.models[model.name].api.filename} to ${
            model.api.filename
          }`,
        );
      }
    }

    this.models[model.name] = model;
  }

  addEnum(enumModel: Model, override: boolean) {
    if (!enumModel.internal) {

      if (!override && this.enums[enumModel.name] !== undefined) {
        throw new Error(
          `try to override an already defined enum: ${enumModel.name} from ${
            this.models[enumModel.name].api.filename
          } to ${enumModel.api.filename}`,
        );
      }
    }

    this.enums[enumModel.name] = enumModel;
  }

  addMethod(method: Method, override: boolean) {
    if (!override && this.methods[method.operationId] !== undefined) {
      throw new Error(
        `try to override an already defined method: ${method.operationId} from ${this.methods[method.operationId]} to ${
          method.api.filename
        }`,
      );
    }

    this.methods[method.operationId] = method;
  }

  /**
   * Only loop objects
   */
  eachModel(cb: (m: Model, modelName: string) => void) {
    _.each(this.models, (m: Model, modelName: string) => {
      if (m.type.type == "object") {
        cb(m, modelName);
      }
    });
  }

  eachEnum(cb: (m: Model, modelName: string) => void) {
    _.each(this.enums, cb);
  }

  eachMethod(cb: (m: Method, operationId: string) => void) {
    _.each(this.methods, cb);
  }

  eachResolve(cb: (m: Method, operationId: string) => void) {
    this.eachMethod((m, operationId) => {
      if (m.resolve) {
        cb(m, operationId);
      }
    });
  }

  aggregate(api: Api, overrideMethods, overrideModels) {
    api.eachMethod((m) => {
      this.addMethod(m, overrideMethods);
    });

    api.eachModel((m) => {
      this.addModel(m, overrideModels);
    });
  }

  sort() {
    this.methods = ksort(this.methods);
    this.models = ksort(this.models);
    this.enums = ksort(this.enums);
  }

  getReference<T>(ref: string): T {
    if (ref.indexOf("#/components/") !== 0) {
      throw new Error(`Cannot resolve: ${ref}`);
    }

    ref = ref.substr("#/components/".length);
    const c = ref.indexOf("/");
    const where = ref.substr(0, c);
    const target = ref.substr(c + 1);

    switch (where) {
      case "schemas":
        if (!this.models[target] && !this.enums[target]) {
          throw new Error(`getReference: can't find definition: ${target} at ${this.filename}`);
        }

        return (this.models[target] || this.enums[target]) as any;
      case "parameters":
        if (!this.parameters[target]) {
          throw new Error(`getReference: can't find parameter: ${target} at ${this.filename}`);
        }

        return (this.parameters[target]) as any;
      case "responses":
        if (!this.responses[target]) {
          throw new Error(`getReference: can't find responses: ${target} at ${this.filename}`);
        }

        return (this.responses[target]) as any;
      default:
        throw new Error(`getReference: target[${ref}] not handled`);
    }
  }
}
