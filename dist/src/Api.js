"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const path = require("path");
const Method_1 = require("./Method");
const Model_1 = require("./Model");
const Parameter_1 = require("./Parameter");
const Response_1 = require("./Response");
const utils_1 = require("./utils");
const blacklist = [];
/**
 * Api definicion class
 */
class Api {
    constructor() {
        this.methods = {};
        /**
         * references: #/definitions/XXXX
         */
        this.models = {};
        /**
         * This is just a special place for enums, to keep it separate from
         * other models because has no "class.parse"
         *
         * references: #/definitions/XXXX
         */
        this.enums = {};
        /**
         * references: #/parameters/XXXX
         */
        this.parameters = {};
        /**
         * references: #/responses/XXXX
         */
        this.responses = {};
        // two levels when executed as JS
        this.root = path.join(__dirname, "..", "..");
    }
    static parseOpenApi(filename, swagger) {
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
        // TODO validate!!
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
            console.warn(`angularClientNodeModuleName not defined, using api-module: x-nema.angularClientNodeModuleName at ${filename}`);
            api.angularClientNodeModuleName = "api-module";
        }
        if (!api.angularClientModuleName) {
            console.warn(`angularClientModuleName not defined, using ApiModule: x-nema.angularClientModuleName at ${filename}`);
            api.angularClientModuleName = "ApiModule";
        }
        api.host = swagger.host;
        api.basePath = swagger.basePath || "/";
        console.log(swagger);
        api.servers = swagger.servers;
        if (!api.servers || !api.servers.length) {
            throw new Error(`#/components/servers is required at ${filename}`);
        }
        // TODO remove this and use it directly!!
        api.version = swagger.info.version || "";
        api.description = swagger.info.description || "";
        api.authorName = swagger.info.contact.name || "";
        api.authorEmail = swagger.info.contact.email || "";
        api.authorURL = swagger.info.contact.url || "";
        api.parseSwaggerDefinitions(swagger, false);
        _.each(swagger.components.parameters, (param, paramName) => {
            api.parameters[paramName] = Parameter_1.Parameter.parseOpenApi(api, param);
        });
        _.each(swagger.components.responses, (param, paramName) => {
            api.responses[paramName] = Response_1.Response.parseSwagger(api, null, param);
        });
        _.each(swagger.paths, (pathItem, uri) => {
            if (["/swagger"].indexOf(uri) !== -1) {
                throw new Error(`forbidden API uri: ${uri}`);
            }
            console.log(pathItem);
            ["get", "put", "post", "delete", "options", "head", "patch", "trace"].forEach((verb) => {
                const method = pathItem[verb];
                if (method) {
                    console.log("parsing: ", method.operationId, JSON.stringify(method, null, 2));
                    api.addMethod(Method_1.Method.parseOpenApi(api, verb, uri, (method.parameters || []).concat(pathItem.parameters).filter((x) => x != null), method), false);
                }
            });
        });
        return api;
    }
    /**
     * @internal used to declare blacklisted models
     */
    parseSwaggerDefinitions(swagger, internal) {
        _.each((swagger.components || {}).schemas, (model, name) => {
            const mdl = Model_1.Model.parseSwagger(this, name, model);
            mdl.internal = internal;
            if (mdl.isEnum()) {
                this.addEnum(mdl, false);
            }
            else {
                this.addModel(mdl, false);
            }
        });
        _.each(swagger.parameters, (param, paramName) => {
            this.parameters[paramName] = Parameter_1.Parameter.parseOpenApi(this, param);
        });
    }
    /**
     * @internal used to declare blacklisted models
     */
    addModel(model, override) {
        if (!model.internal) {
            if (blacklist.indexOf(model.name) !== -1) {
                throw new Error(`Invalid model name: ${model.name}, it's blacklisted from ${model.api.filename}`);
            }
            //console.log(`addModel: ${model.name}`);
            if (!override && this.models[model.name] !== undefined) {
                throw new Error(`try to override an already defined model: ${model.name} from ${this.models[model.name].api.filename} to ${model.api.filename}`);
            }
        }
        this.models[model.name] = model;
    }
    addEnum(enumModel, override) {
        if (!enumModel.internal) {
            if (blacklist.indexOf(enumModel.name) !== -1) {
                throw new Error(`Invalid enum name: ${enumModel.name}, it's blacklisted from ${enumModel.api.filename}`);
            }
            if (!override && this.enums[enumModel.name] !== undefined) {
                throw new Error(`try to override an already defined enum: ${enumModel.name} from ${this.models[enumModel.name].api.filename} to ${enumModel.api.filename}`);
            }
        }
        this.enums[enumModel.name] = enumModel;
    }
    addMethod(method, override) {
        if (!override && this.methods[method.operationId] !== undefined) {
            throw new Error(`try to override an already defined method: ${method.operationId} from ${this.methods[method.operationId]} to ${method.api.filename}`);
        }
        this.methods[method.operationId] = method;
    }
    /**
     * Only loop objects
     */
    eachModel(cb) {
        _.each(this.models, (m, modelName) => {
            if (m.type.type == "object") {
                cb(m, modelName);
            }
        });
    }
    eachEnum(cb) {
        _.each(this.enums, cb);
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
        this.methods = utils_1.ksort(this.methods);
        this.models = utils_1.ksort(this.models);
        this.enums = utils_1.ksort(this.enums);
    }
    getReference(ref) {
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
                return (this.models[target] || this.enums[target]);
            case "parameters":
                if (!this.parameters[target]) {
                    throw new Error(`getReference: can't find parameter: ${target} at ${this.filename}`);
                }
                return (this.parameters[target]);
            case "responses":
                if (!this.responses[target]) {
                    throw new Error(`getReference: can't find responses: ${target} at ${this.filename}`);
                }
                return (this.responses[target]);
            default:
                throw new Error(`getReference: target[${ref}] not handled`);
        }
    }
}
exports.Api = Api;
//# sourceMappingURL=Api.js.map