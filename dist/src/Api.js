"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const _ = require("lodash");
const path = require("path");
const Method_1 = require("./Method");
const Model_1 = require("./Model");
function ksort(obj) {
    const ret = {};
    Object.keys(obj).sort().forEach((k) => {
        ret[k] = obj[k];
    });
    return ret;
}
class Api {
    constructor() {
        this.methods = {};
        this.models = {};
    }
    static parseSwagger(filename, swagger) {
        const api = new Api();
        api.filename = filename;
        // TODO is generating front ? -> override basePath
        // keep compat with old generator, sry
        if (swagger["x-generator-properties"]) {
            console.warn(`deprecated x-generator-properties at ${filename}`);
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
        return Api.parseSwagger(filename, swaggerJSON);
    }
    addModel(model, override) {
        if (!override && this.models[model.name] !== undefined) {
            throw new Error(`try to override an already defined model: ${model.name} from ${this.models[model.name].api.filename} to ${model.api.filename}`);
        }
        this.models[model.name] = model;
    }
    addMethod(method, override) {
        if (!override && this.methods[method.operationId] !== undefined) {
            throw new Error(`try to override an already defined method: ${method.operationId} from ${this.methods[method.operationId]} to ${method.api.filename}`);
        }
        this.methods[method.operationId] = method;
    }
    eachModel(cb) {
        _.each(this.models, cb);
    }
    eachMethod(cb) {
        _.each(this.methods, cb);
    }
    eachResolve(cb) {
        this.eachMethod((m, operationId) => {
            if (m.resolve) {
                cb(m, operationId);
            }
        });
    }
    aggregate(api, overrideMethods, overrideModels) {
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
exports.Api = Api;
//# sourceMappingURL=Api.js.map