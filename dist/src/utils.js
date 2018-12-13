"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const swagger_parser_1 = require("swagger-parser");
const chalk = require("chalk");
class Limitation extends Error {
}
exports.Limitation = Limitation;
;
class Deprecation extends Error {
}
exports.Deprecation = Deprecation;
;
class Requirement extends Error {
}
exports.Requirement = Requirement;
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
        console.error(content, context);
        throw new Error("Only a single content encoding is allowed");
    }
    console.log(["application/json", "multipart/form-data"].indexOf(k[0]), k[0].indexOf("text/"));
    if (["application/json", "multipart/form-data", "application/x-www-form-urlencoded"].indexOf(k[0]) === -1 &&
        k[0].indexOf("text/") != 0) {
        console.error(content, context);
        throw new Error(`Unsupported content type: ${k[0]}`);
    }
}
exports.checkContent = checkContent;
function green(text) {
    console.log(chalk.green.bold(text));
}
exports.green = green;
function red(text) {
    console.log(chalk.red.bold(text));
}
exports.red = red;
function blue(text) {
    console.log(chalk.cyanBright(text));
}
exports.blue = blue;
function yellow(text) {
    console.log(chalk.yellowBright(text));
}
exports.yellow = yellow;
function swaggerParseAndConvert(filename, cb) {
    console.info(`parsing: ${filename}`);
    swagger_parser_1.parse(filename, (err, swagger) => {
        if (err)
            throw err;
        if (!swagger.openapi) {
            var converter = require('swagger2openapi');
            return converter.convertObj(swagger, {}, function (err, options) {
                if (err)
                    throw err;
                // options.openapi contains the converted definition
                cb(options.openapi);
            });
        }
        cb(swagger);
    });
}
exports.swaggerParseAndConvert = swaggerParseAndConvert;
//# sourceMappingURL=utils.js.map