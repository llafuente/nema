import * as fs from "fs";
import * as _ from "lodash";
import * as path from "path";

import { Method } from "./Method";
import { Model } from "./Model";
import { Parameter } from "./Parameter";
import { Response } from "./Response";

function ksort(obj) {
  const ret = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => {
      ret[k] = obj[k];
    });

  return ret;
}

const blacklist = [
  "Error",
  "CommonException",
  "express",
  "Request",
  "Response",
  "Random",
  "Cast",
  "Operators",
  "Order",
  "Where",
  "Page",
];

export function parseYML(filename) {
  const contents = fs.readFileSync(filename);

  try {
    return require("yamljs").parse(contents.toString());
  } catch (e) {
    console.error(e);
    throw e;
  }
}

/**
 * Api definicion class
 */
export class Api {
  /** source file filename */
  filename: string;
  /** Swagger contents atm */
  originalSource: any;
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
  schemes: string[];
  /** Application base path */
  basePath: string;
  /** Host */
  host: string;
  /**
   * Path for front applications, may not be the same because reverse-proxies could be
   * in the middle
   */
  frontBasePath: string;

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

  constructor() {}

  static parseSwagger(filename: string, swagger: any): Api {
    const api = new Api();

    api.filename = filename;
    Object.defineProperty(api, "originalSource", { value: swagger, writable: true, enumerable: false });

    // TODO is generating front ? -> override basePath
    // keep compat with old generator, sry
    if (swagger["x-generator-properties"]) {
      console.warn(`deprecated x-generator-properties at ${filename}`);
      api.apiName = swagger["x-generator-properties"]["api-name"];
      api.angularClientNodeModuleName = swagger["x-generator-properties"]["module-name"];
      api.angularClientModuleName = swagger["x-generator-properties"]["module-name"];
      api.frontBasePath = swagger["x-generator-properties"]["front-basePath"];
    }

    if (swagger["x-nema"]) {
      api.apiName = swagger["x-nema"].apiName;
      api.angularClientNodeModuleName = swagger["x-nema"].angularClientNodeModuleName;
      api.angularClientModuleName = swagger["x-nema"].angularClientModuleName;
      api.frontBasePath = swagger["x-nema"].frontBasePath;
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
    // frontBasePath is optional

    swagger["x-nema"] = swagger["x-nema"] || {};
    swagger.info = swagger.info || {};
    swagger.info.contact = swagger.info.contact || {};

    api.host = swagger.host;
    api.basePath = swagger.basePath || "/";
    api.schemes = swagger.schemes;
    if (!api.schemes) {
      throw new Error(`schemes is required at ${filename}`);
    }

    api.version = swagger.info.version || "";
    api.description = swagger.info.description || "";
    api.authorName = swagger.info.contact.name || "";
    api.authorEmail = swagger.info.contact.email || "";
    api.authorURL = swagger.info.contact.url || "";

    _.each(swagger.paths, (pathItem, uri) => {
      if (["/swagger"].indexOf(uri) !== -1) {
        throw new Error(`forbidden API uri: ${uri}`);
      }

      ["get", "post", "patch", "put", "delete", "head"].forEach((verb) => {
        const method = pathItem[verb];

        if (method) {
          api.addMethod(
            Method.parseSwagger(
              api,
              verb,
              uri,
              (method.parameters || []).concat(pathItem.parameters).filter((x) => x != null),
              method.consumes || swagger.consumes || [],
              method.produces || swagger.produces || [],
              method,
            ),
            false,
          );
        }
      });
    });

    api.parseSwaggerDefinitions(swagger, false);

    _.each(swagger.parameters, (param, paramName) => {
      api.parameters[paramName] = Parameter.parseSwagger(api, param);
    });

    _.each(swagger.responses, (param, paramName) => {
      api.responses[paramName] = Response.parseSwagger(api, null, param);
    });

    return api;
  }

  /**
   * @internal used to declare blacklisted models
   */
  parseSwaggerDefinitions(swagger: any, internal: boolean) {
    _.each(swagger.definitions, (model, name) => {
      const mdl = Model.parseSwagger(this, name, model);
      mdl.internal = internal;

      if (mdl.isEnum()) {
        this.addEnum(mdl, false);
      } else {
        this.addModel(mdl, false);
      }
    });

    _.each(swagger.parameters, (param, paramName) => {
      this.parameters[paramName] = Parameter.parseSwagger(this, param);
    });
  }

  static parseSwaggerFile(filename: string): Api {
    let swaggerJSON;

    switch (path.extname(filename)) {
      case ".json":
        swaggerJSON = require(filename);
        break;
      case ".yml":
      case ".yaml":
        swaggerJSON = parseYML(filename);
        break;
    }

    return Api.parseSwagger(filename, swaggerJSON);
  }
  /**
   * @internal used to declare blacklisted models
   */
  addModel(model: Model, override: boolean) {
    if (!model.internal) {
      if (blacklist.indexOf(model.name) !== -1) {
        throw new Error(`Invalid model name: ${model.name}, it's blacklisted from ${model.api.filename}`);
      }

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
      if (blacklist.indexOf(enumModel.name) !== -1) {
        throw new Error(`Invalid enum name: ${enumModel.name}, it's blacklisted from ${enumModel.api.filename}`);
      }

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

  eachModel(cb: (m: Model, modelName: string) => void) {
    _.each(this.models, cb);
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

  getReference(ref: string): Model | Parameter | Response {
    //console.log(`getReference(${ref})`);
    ref = ref.substr(2);
    const c = ref.indexOf("/");
    const where = ref.substr(0, c);
    const target = ref.substr(c + 1);

    switch (where) {
      case "definitions":
        if (!this.models[target] && !this.enums[target]) {
          throw new Error(`getReference: can't find definition: ${target} at ${this.filename}`);
        }

        return this.models[target] || this.enums[target];
      case "parameters":
        if (!this.parameters[target]) {
          throw new Error(`getReference: can't find parameter: ${target} at ${this.filename}`);
        }

        return this.parameters[target];
      case "responses":
        if (!this.responses[target]) {
          throw new Error(`getReference: can't find responses: ${target} at ${this.filename}`);
        }

        return this.responses[target];
      default:
        throw new Error(`getReference: target[${ref}] not handled`);
    }
  }
}
