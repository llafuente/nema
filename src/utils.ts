import { OpenAPIObject, PathItemObject, SchemaObject, MediaTypeObject } from "openapi3-ts";
import * as _ from "lodash";
import { parse as parseSwagger } from "swagger-parser";
const chalk = require("chalk");

export class Limitation extends Error {};
export class Deprecation extends Error {};
export class Requirement extends Error {};

export function camelcase(str) {
  return str
    .replace(/\[.*\]/g, "")
    .toLowerCase()
    .replace(/[_.\- ]+(\w|$)/g, (m, p1) => p1.toUpperCase());
}

export function ksort(obj) {
  const ret = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => {
      ret[k] = obj[k];
    });

  return ret;
}

export function uniquePush(arr: any[], str: any) {
  if (arr.indexOf(str) === -1) {
    arr.push(str);
  }
}

export function eachMethod(openApi3: OpenAPIObject, cb: (m: PathItemObject, modelName: string) => void) {
  _.each(openApi3.paths, cb);
}

export function eachModel(openApi3: OpenAPIObject, cb: (m: SchemaObject, modelName: string) => void) {
  _.each(openApi3.components.schemas, (model: SchemaObject, modelName: string) => {
    if (model.type == "object") {
      cb(model, modelName);
    }
  });
}

export function eachEnum(openApi3: OpenAPIObject, cb: (m: SchemaObject, modelName: string) => void) {
  _.each(openApi3.components.schemas, (model: SchemaObject, modelName: string) => {
    if (model.type == "enum") {
      cb(model, modelName);
    }
  });
}

export function eachResolve(openApi3: OpenAPIObject, cb: (m: SchemaObject, modelName: string) => void) {
  eachMethod(openApi3, (method, operationId) => {
    if (method["x-resolve"]) {
      cb(method, operationId);
    }
  });
}


export function schemaObjectTS(schema: SchemaObject): string {
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


export function checkContent(content, context = undefined) {
  const k = Object.keys(content);

  if (k.length > 1) {
    console.error(content, context);
    throw new Error("Only a single content encoding is allowed");
  }

  console.log(
    ["application/json", "multipart/form-data"].indexOf(k[0]),
    k[0].indexOf("text/")
  );

  if (
    ["application/json", "multipart/form-data", "application/x-www-form-urlencoded"].indexOf(k[0]) === -1 &&
    k[0].indexOf("text/") != 0
  ) {
    console.error(content, context);
    throw new Error(`Unsupported content type: ${k[0]}`)
  }
}

export function green(text) {
  console.log(chalk.green.bold(text));
}

export function red(text) {
  console.log(chalk.red.bold(text));
}

export function blue(text) {
  console.log(chalk.cyanBright(text));
}

export function yellow(text) {
  console.log(chalk.yellowBright(text));
}

export function swaggerParseAndConvert(filename, cb: (openApi3) => void) {
  console.info(`parsing: ${filename}`);
  parseSwagger(filename, (err, swagger) => {
    if (err) throw err;

    if (!swagger.openapi) {
      var converter = require('swagger2openapi');
      return converter.convertObj(swagger, {}, function(err, options){
        if (err) throw err;

        // options.openapi contains the converted definition
        cb(options.openapi);
      });
    }

    cb(swagger);
  });
}
