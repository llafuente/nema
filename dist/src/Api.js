"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const _ = require("lodash");
const path = require("path");
const Method_1 = require("./Method");
const Model_1 = require("./Model");
class Api {
    constructor() {
        this.methods = {};
        this.models = {};
    }
    static parse(swagger) {
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
                    api.addMethod(Method_1.Method.parse(api, verb, url, (method.parameters || []).concat(pathItem.parameters).filter((x) => x != null), method.consumes || swagger.consumes || [], method.produces || swagger.produces || [], method), false);
                }
            });
        });
        _.each(swagger.definitions, (model, name) => {
            api.addModel(Model_1.Model.parse(api, name, model), false);
        });
        return api;
    }
    static parseSwaggerFile(filename) {
        const contents = fs.readFileSync(filename);
        let swaggerJSON;
        try {
            swaggerJSON = require("yamljs").parse(contents.toString());
        }
        catch (e) {
            console.error(e);
            throw e;
        }
        return Api.parse(swaggerJSON);
    }
    addModel(model, override) {
        if (!override && this.models[model.name] !== undefined) {
            throw new Error("try to override an already defined model");
        }
        this.models[model.name] = model;
    }
    addMethod(method, override) {
        if (!override && this.methods[method.operationId] !== undefined) {
            throw new Error("try to override an already defined method");
        }
        this.methods[method.operationId] = method;
    }
    eachModel(cb) {
        _.each(this.models, cb);
    }
    eachMethod(cb) {
        _.each(this.methods, cb);
    }
    aggregate(api, overrideMethods, overrideModels) {
        api.eachMethod((m) => {
            this.addMethod(m, overrideMethods);
        });
        api.eachModel((m) => {
            this.addModel(m, overrideModels);
        });
    }
}
exports.Api = Api;
//# sourceMappingURL=Api.js.map