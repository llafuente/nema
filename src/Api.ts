import * as fs from "fs";
import * as _ from "lodash";
import * as path from "path";

import { Method } from "./Method";
import { Type } from "./Type";
import { Model } from "./Model";

function ksort(obj) {
  const ret = {};
  Object.keys(obj).sort().forEach((k) => {
    ret[k] = obj[k];
  });

  return ret;
}

/**
 * Api definicion class
 */
export class Api {
  /**
   * source file filename
   */
  filename: string;

  angularModuleName: string;
  nodeModuleName: string;
  apiName: string;

  version: string;
  description: string;

  schemes: string[];
  basePath: string;
  host: string;

  authorName: string;
  authorEmail: string;
  authorURL: string;

  methods: { [name: string]: Method} = {};
  models: { [name: string]: Model} = {};

  constructor() {

  }

  static parseSwagger(filename: string, swagger: any): Api {
    const api = new Api();
    api.filename = filename;
    // TODO is generating front ? -> override basePath
    // keep compat with old generator, sry
    if (swagger["x-generator-properties"]) {
      console.warn(`deprecated x-generator-properties at ${filename}`)
    }
    swagger["x-generator-properties"] = swagger["x-generator-properties"] || {};
    swagger["x-nema"] = swagger["x-nema"] || {};
    swagger["info"] = swagger["info"] || {};
    swagger["info"]["contact"] = swagger["info"]["contact"] || {};

    api.host = swagger["host"];
    api.basePath = swagger["x-generator-properties"]["front-basePath"] || swagger["x-nema"]["front-basePath"] || swagger.basePath;
    api.angularModuleName = swagger["x-generator-properties"]["module-name"] || swagger["x-nema"]["angularModuleName"] || "ApiModule";
    api.nodeModuleName = swagger["x-generator-properties"]["module-name"] || swagger["x-nema"]["nodeModuleName"] || "api-module";
    api.apiName = swagger["x-generator-properties"]["api-name"] || swagger["x-nema"]["apiName"] || "Api";
    api.schemes = swagger["schemes"];

    api.version = swagger.info.version || "";
    api.description = swagger.info.description || "";
    api.authorName = swagger.info.contact.name || "";
    api.authorEmail = swagger.info.contact.email || "";
    api.authorURL = swagger.info.contact.url || "";

    _.each(swagger.paths, (pathItem, uri) => {
      const url = path.posix.join(api.basePath, uri);

      ["get", "post", "patch", "put", "delete", "head"].forEach((verb) => {
        const method = pathItem[verb];

        if (method) {
          api.addMethod(Method.parseSwagger(
            api,
            verb,
            url,
            (method.parameters || []).concat(pathItem.parameters).filter((x) => x != null),
            method.consumes || swagger.consumes || [],
            method.produces || swagger.produces || [],
            method
          ), false);

        }
      })
    });

    _.each(swagger.definitions, (model, name) => {
      api.addModel(Model.parseSwagger(api, name, model), false);
    });

    return api;
  }

  static parseSwaggerFile(filename): Api {
    const contents = fs.readFileSync(filename);

    let swaggerJSON;
    try {
      swaggerJSON = require("yamljs").parse(contents.toString());
    } catch(e) {
      console.error(e);
      throw e;
    }

    return Api.parseSwagger(filename, swaggerJSON);
  }

  addModel(model: Model, override: boolean) {
    if (!override && this.models[model.name] !== undefined) {
      throw new Error(`try to override an already defined model: ${model.name} from ${this.models[model.name].api.filename} to ${model.api.filename}`);
    }

    this.models[model.name] = model;
  }

  addMethod(method: Method, override: boolean) {
    if (!override && this.methods[method.operationId] !== undefined) {
      throw new Error(`try to override an already defined method: ${method.operationId} from ${this.methods[method.operationId]} to ${method.api.filename}`);
    }

    this.methods[method.operationId] = method;
  }

  eachModel(cb: (m: Model, modelName: string) => void) {
    _.each(this.models, cb);
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
  }
}
