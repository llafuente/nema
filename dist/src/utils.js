"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
class Limitation extends Error {
}
exports.Limitation = Limitation;
;
class Deprecation extends Error {
}
exports.Deprecation = Deprecation;
;
function camelcase(str) {
    return str
        .replace(/\[.*\]/g, "")
        .toLowerCase()
        .replace(/[_.\- ]+(\w|$)/g, (m, p1) => p1.toUpperCase());
}
exports.camelcase = camelcase;
function ksort(obj) {
    const ret = {};
    Object.keys(obj)
        .sort()
        .forEach((k) => {
        ret[k] = obj[k];
    });
    return ret;
}
exports.ksort = ksort;
function uniquePush(arr, str) {
    if (arr.indexOf(str) === -1) {
        arr.push(str);
    }
}
exports.uniquePush = uniquePush;
function eachMethod(openApi3, cb) {
    _.each(openApi3.paths, cb);
}
exports.eachMethod = eachMethod;
function eachModel(openApi3, cb) {
    _.each(openApi3.components.schemas, (model, modelName) => {
        if (model.type == "object") {
            cb(model, modelName);
        }
    });
}
exports.eachModel = eachModel;
function eachEnum(openApi3, cb) {
    _.each(openApi3.components.schemas, (model, modelName) => {
        if (model.type == "enum") {
            cb(model, modelName);
        }
    });
}
exports.eachEnum = eachEnum;
function eachResolve(openApi3, cb) {
    eachMethod(openApi3, (method, operationId) => {
        if (method["x-resolve"]) {
            cb(method, operationId);
        }
    });
}
exports.eachResolve = eachResolve;
function schemaObjectTS(schema) {
    // defer to subschema
    // if (schema.referenceModel) {
    //   return (this.api.getReference(this.referenceModel) as Model).name;
    // }
    // if (this.isDefinition) {
    //   return this.name;
    // }
    switch (schema.type) {
        case "reference":
        case "enum":
            throw new Error("should not happen");
        case "file":
            return "Blob";
        case "boolean":
            return "boolean";
        case "date":
            return "Date";
        case "string":
            return "string";
        case "array":
            return `${schemaObjectTS(schema.items)}[]`;
        case "number":
            return "number";
        case "object":
            return "any";
        case "void":
            return "void";
        default:
            throw new Error("unhandled type");
    }
}
exports.schemaObjectTS = schemaObjectTS;
function checkContent(content, context = undefined) {
    const k = Object.keys(content);
    if (k.length > 1) {
        console.error(context);
        throw new Error("Only a single content encoding is allowed");
    }
    // TODO add multipart/binary, maybe even romeve it!
    if (k[0] != "application/json") {
        console.error(context);
        throw new Error(`Unsupported content type: ${k[0]}`);
    }
}
exports.checkContent = checkContent;
//# sourceMappingURL=utils.js.map