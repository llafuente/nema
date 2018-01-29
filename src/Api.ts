import * as fs from "fs";
import * as _ from "lodash";
import * as path from "path";

import { Method } from "./Method";
import { Type } from "./Type";
import { Model } from "./Model";

export class Api {
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

  static parse(swagger: any): Api {
    const api = new Api();
    // TODO is generating front ? -> override basePath
    // keep compat with old generator, sry
    swagger["x-generator-properties"] = swagger["x-generator-properties"] || {};
    swagger["x-nema"] = swagger["x-nema"] || {};
    swagger["info"] = swagger["info"] || {};
    swagger["info"]["contact"] = swagger["info"]["contact"] || {};

    api.host = swagger["host"];
    api.basePath = swagger["x-generator-properties"]["front-basePath"] || swagger["x-nema"]["front-basePath"] || swagger.basePath;
    api.angularModuleName = swagger["x-generator-properties"]["angularModuleName"] || swagger["x-nema"]["angularModuleName"] || "ApiModule";
    api.nodeModuleName = swagger["x-generator-properties"]["nodeModuleName"] || swagger["x-nema"]["nodeModuleName"] || "api-module";
    api.apiName = swagger["x-generator-properties"]["apiName"] || swagger["x-nema"]["apiName"] || "Api";
    api.schemes = swagger["schemes"];

    api.version = swagger.info.version || "";
    api.description = swagger.info.description || "";
    api.authorName = swagger.info.contact.name || "";
    api.authorEmail = swagger.info.contact.email || "";
    api.authorURL = swagger.info.contact.url || "";

    _.each(swagger.paths, (pathItem, uri) => {
      //console.log(pathItem);
      const url = path.posix.join(api.basePath, uri);

      ["get", "post", "patch", "put", "delete", "head"].forEach((verb) => {
        const method = pathItem[verb];

        if (method) {
          api.addMethod(Method.parse(
            api,
            verb,
            url,
            (method.parameters || []).concat(pathItem.parameters).filter((x) => x != null),
            method.consumes || swagger.consumes || [],
            method.produces || swagger.produces || [],
            method
          ));

        }
      })
    });

    _.each(swagger.definitions, (model, name) => {
      api.addModel(Model.parse(api, name, model));
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

    return Api.parse(swaggerJSON);
  }

  addModel(model: Model) {
    if (this.models[model.name] !== undefined) {
      throw new Error("try to override an already defined model");
    }

    this.models[model.name] = model;
  }

  addMethod(method: Method) {
    if (this.methods[method.operationId] !== undefined) {
      throw new Error("try to override an already defined method");
    }

    this.methods[method.operationId] = method;
  }

  eachModel(cb: (m: Model, modelName: string) => void) {
    _.each(this.models, cb);
  }

  eachMethod(cb: (m: Method, operationId: string) => void) {
    _.each(this.methods, cb);
  }


}
