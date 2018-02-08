"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const _ = require("lodash");
const Method_1 = require("./Method");
const Model_1 = require("./Model");
const Parameter_1 = require("./Parameter");
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
class Api {
    constructor() {
        this.methods = {};
        this.models = {};
        this.parameters = {};
    }
    static parseSwagger(filename, swagger) {
        const api = new Api();
        api.filename = filename;
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
            api.apiName = swagger["x-nema"]["apiName"];
            api.angularClientNodeModuleName = swagger["x-nema"]["angularClientNodeModuleName"];
            api.angularClientModuleName = swagger["x-nema"]["angularClientModuleName"];
            api.frontBasePath = swagger["x-nema"]["frontBasePath"];
        }
        if (!api.apiName) {
            console.warn(`apiName not defined, using Api: x-nema.apiName at ${filename}`);
            api.apiName = "Api";
        }
        if (!api.angularClientNodeModuleName) {
            console.warn(`angularClientNodeModuleName not defined, using api-module: x-nema.angularClientNodeModuleName at ${filename}`);
            api.angularClientNodeModuleName = "api-module";
        }
        if (!api.angularClientModuleName) {
            console.warn(`angularClientModuleName not defined, using ApiModule: x-nema.angularClientModuleName at ${filename}`);
            api.angularClientModuleName = "ApiModule";
        }
        // frontBasePath is optional
        swagger["x-nema"] = swagger["x-nema"] || {};
        swagger["info"] = swagger["info"] || {};
        swagger["info"]["contact"] = swagger["info"]["contact"] || {};
        api.host = swagger["host"];
        api.basePath = swagger.basePath || "/";
        api.schemes = swagger["schemes"];
        if (!api.schemes) {
            throw new Error(`schemes is required at ${filename}`);
        }
        api.version = swagger.info.version || "";
        api.description = swagger.info.description || "";
        api.authorName = swagger.info.contact.name || "";
        api.authorEmail = swagger.info.contact.email || "";
        api.authorURL = swagger.info.contact.url || "";
        _.each(swagger.paths, (pathItem, uri) => {
            ["get", "post", "patch", "put", "delete", "head"].forEach((verb) => {
                const method = pathItem[verb];
                if (method) {
                    api.addMethod(Method_1.Method.parseSwagger(api, verb, uri, (method.parameters || []).concat(pathItem.parameters).filter((x) => x != null), method.consumes || swagger.consumes || [], method.produces || swagger.produces || [], method), false);
                }
            });
        });
        _.each(swagger.definitions, (model, name) => {
            api.addModel(Model_1.Model.parseSwagger(api, name, model), false);
        });
        _.each(swagger.parameters, (param, paramName) => {
            api.parameters[paramName] = Parameter_1.Parameter.parseSwagger(param);
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
        //console.log(`addModel: ${model.name}`);
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
    getReference(ref) {
        ref = ref.substr(2);
        const c = ref.indexOf("/");
        const where = ref.substr(0, c);
        const target = ref.substr(c + 1);
        switch (where) {
            case "definitions":
                if (!this.models[target]) {
                    throw new Error(`getReference: can't find definition: ${target} at ${this.filename}`);
                }
                return this.models[target];
            case "parameters":
                if (!this.parameters[target]) {
                    throw new Error(`getReference: can't find parameter: ${target} at ${this.filename}`);
                }
                return this.parameters[target];
            default:
                throw new Error("getReference: target not handled");
        }
    }
}
exports.Api = Api;
//# sourceMappingURL=Api.js.map