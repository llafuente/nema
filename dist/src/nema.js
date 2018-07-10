#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("./Api");
const Angular5Api_1 = require("./generators/Angular5Api");
const Angular5FormTemplate_1 = require("./generators/Angular5FormTemplate");
const MongooseApi_1 = require("./generators/MongooseApi");
const MongooseApp_1 = require("./generators/MongooseApp");
const ExpressApi_1 = require("./generators/ExpressApi");
const ExpressApp_1 = require("./generators/ExpressApp");
const ExpressCSV_1 = require("./generators/ExpressCSV");
const path = require("path");
const fs = require("fs");
const program = require("commander");
const chalk = require("chalk");
const packageJSON = require(path.join(__dirname, "..", "..", "package.json"));
console.log(`
 _  _  _ _  _
| |(/_| | |(_|${packageJSON.version}
`);
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
program
    .version(packageJSON.version)
    .description("Code generation from OpenApi 2/3")
    .option("--angular5-api", "TARGET(project) Generate an Angular 5 Module Api client")
    .option("--mongoose-api", "TARGET(project) Generate Mongoose Schemas, Models & Repositories")
    .option("--mongoose-app", `TARGET(project) Generate Mongoose Express app
require --express-api in the same destination`)
    .option("--express-api", "TARGET(project) Generate Express routes/models")
    .option("--express-app", "TARGET(project) Generate Express app")
    .option("--express-csv", "TARGET(project) Experimental")
    .option("--angular5-form-template <path>", "TARGET(file) Generate an Angular 5 Template from given model")
    .option("--override-models", "Override all models while agreggating")
    .option("--override-methods", "Override all methods while agreggating")
    .option("--lint", "Lint output (tslint), this may take a while")
    .option("--src <path>", "Path to definition file, repeat to aggregate", function (val, memo) {
    memo.push(val);
    return memo;
}, [])
    .option("--file <path>", "Output file path for file generators path")
    .option("--dst <path>", "Output directory path project generators. By default: same as the first definition file")
    .parse(process.argv);
program.on("--help", function () {
    console.log("");
    console.log("  At least one definition file is required");
    console.log("  One TARGET is required");
    console.log("");
    console.log("  Examples:");
    console.log("");
    console.log("  Generate and express with mongoose server");
    console.log("    nema --src=swagger-file.yml --express-app --dst server/");
    console.log("    nema --src=swagger-file.yml --mongoose-app --express --dst server/");
    console.log("    nema --src=swagger-file.yml --express-api --dst server/users/");
    console.log("    nema --src=swagger-file.yml --mongoose-api --express --dst server/users");
    console.log("  Generate angular5 client");
    console.log("    nema --src=swagger-file.yml --angular5-api --dst angular/app/src/api/");
    console.log("");
});
if (!program.src) {
    red("--src <path> is required");
    program.help();
    process.exit(1);
}
const targets = (program.angular5Api ? 1 : 0) +
    (program.mongooseApi ? 1 : 0) +
    (program.mongooseApp ? 1 : 0) +
    (program.expressApi ? 1 : 0) +
    (program.expressApp ? 1 : 0) +
    (program.expressCsv ? 1 : 0) +
    (program.angular5FormTemplate ? 1 : 0);
if (targets == 0) {
    red("You must specify a target to generate");
    program.help();
    process.exit(1);
}
if (targets == 2) {
    red("You must specify just one target to generate");
    program.help();
    process.exit(1);
}
// parse and aggregate definitions files
let api;
let dstPath = program.dst || null;
if (dstPath && !path.isAbsolute(dstPath)) {
    dstPath = path.join(process.cwd(), dstPath);
}
const swagger_parser_1 = require("swagger-parser");
function parse(filename, cb) {
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
//import * as async from "async";
program.src.forEach((swaggerOrOpenApiFilename) => {
    parse(swaggerOrOpenApiFilename, (openApi3) => {
        if (!dstPath) {
            dstPath = path.dirname(swaggerOrOpenApiFilename);
        }
        api = Api_1.Api.parseOpenApi(swaggerOrOpenApiFilename, dstPath, openApi3);
    });
    // TODO aggregate!
    /*
    if (api) {
      api.aggregate(Api.parseSwaggerFile(swagger), !!program.overrideMethods, !!program.overrideModels);
    } else {
      api = Api.parseSwaggerFile(swagger);
  
    }
    */
});
setTimeout(function () {
    console.info(`Destination path: ${dstPath}`);
    const projectGenerators = [];
    // create all projectGenerators
    // some generator may modify api metadata
    if (program.angular5Api) {
        green("Instancing generator: angular5-api");
        new Angular5Api_1.Angular5Api(dstPath, api).generate(true, !!program.lint);
    }
    else if (program.expressApi) {
        green("Instancing generator: express");
        new ExpressApi_1.ExpressApi(dstPath, api).generate(true, !!program.lint);
    }
    else if (program.expressApp) {
        green("Instancing generator: express App");
        new ExpressApp_1.ExpressApp(dstPath, api).generate(true, !!program.lint);
    }
    else if (program.mongooseApi) {
        green("Instancing generator: mongoose");
        new MongooseApi_1.MongooseApi(dstPath, api).generate(true, !!program.lint);
    }
    else if (program.mongooseApp) {
        green("Instancing generator: mongoose App");
        new MongooseApp_1.MongooseApp(dstPath, api).generate(true, !!program.lint);
    }
    else if (program.expressCsv) {
        green("Instancing generator: express CSV");
        new ExpressCSV_1.ExpressCSV(dstPath, api).generate(true, !!program.lint);
    }
    else if (program.angular5FormTemplate) {
        const t = new Angular5FormTemplate_1.Angular5FormTemplate(api);
        green("Generate Angular 5 template");
        t.generate(program.angular5FormTemplate, program.file);
    }
    else {
        // should be here
        throw new Error("wtf?!");
    }
    fs.writeFileSync(path.join(dstPath, "nema.json"), JSON.stringify(api, null, 2));
}, 5000);
//# sourceMappingURL=nema.js.map