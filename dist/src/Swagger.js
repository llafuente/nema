"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const Method_1 = require("./Method");
const Model_1 = require("./Model");
const _ = require("lodash");
const path = require("path");
class Swagger {
    constructor() {
        this.methods = {};
        this.models = {};
    }
    static parse(swagger) {
        const s = new Swagger();
        // TODO is generating front ? -> override basePath
        // keep compat with old generator, sry
        const basePath = swagger["x-generator-properties"]["front-basePath"] || swagger["x-nema"]["front-basePath"] || swagger.basePath;
        _.each(swagger.paths, (pathItem, uri) => {
            console.log(pathItem);
            const url = path.posix.join(basePath, uri);
            ["get", "post", "patch", "put", "delete", "head"].forEach((verb) => {
                const method = pathItem[verb];
                if (method) {
                    s.addMethod(Method_1.Method.parse(url, (method.parameters || []).concat(pathItem.parameters).filter((x) => x != null), method));
                }
            });
        });
        _.each(swagger.definitions, (model, name) => {
            s.addModel(Model_1.Model.parse(name, model));
        });
        return s;
    }
    addModel(model) {
        if (this.models[model.name] !== undefined) {
            throw new Error("try to override an already defined model");
        }
        this.models[model.name] = model;
    }
    addMethod(method) {
        if (this.methods[method.operationId] !== undefined) {
            throw new Error("try to override an already defined method");
        }
        this.methods[method.operationId] = method;
    }
    static parseFile(filename) {
        const contents = fs.readFileSync(filename);
        let swaggerJSON;
        try {
            swaggerJSON = require("yamljs").parse(contents.toString());
        }
        catch (e) {
            console.error(e);
            throw e;
        }
        return Swagger.parse(swaggerJSON);
    }
}
exports.Swagger = Swagger;
//# sourceMappingURL=Swagger.js.map