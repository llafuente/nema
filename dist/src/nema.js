#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("./Api");
const Angular5Client_1 = require("./generators/Angular5Client");
const Angular5FormTemplate_1 = require("./generators/Angular5FormTemplate");
const Mongoose_1 = require("./generators/Mongoose");
const Express_1 = require("./generators/Express");
const Common_1 = require("./generators/Common");
const path = require("path");
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
    .description("Code generation from swagger")
    .option("--angular5-api", "TARGET(project): Generate an Angular 5 Module Api client")
    .option("--mongoose", "TARGET(project): Generate Mongoose Schema, Models & Repositories")
    .option("--express", "TARGET(project): Generate Express app/routes")
    .option("--angular5-form-template <path>", "TARGET(file): Generate an Angular 5 Template from given model")
    .option("--override-models", "Override all models while agreggating")
    .option("--override-methods", "Override all methods while agreggating")
    .option("--lint", "Lint output (tslint), this may take a while")
    .option("--swagger <path>", "Path to swagger yml, repeat to aggregate", function (val, memo) {
    memo.push(val);
    return memo;
}, [])
    .option("--file <path>", "Output for file projectGenerators path")
    .option("--dst <path>", "Output path for project projectGenerators, default: same as the first swagger")
    .parse(process.argv);
program.on("--help", function () {
    console.log("");
    console.log("  At least one swagger file is required");
    console.log("  At least one TARGET is required");
    console.log("");
    console.log("  Examples:");
    console.log("");
    console.log("    nema --swagger=swagger-file.yml --mongoose --express --dst server/");
    console.log("    nema --swagger=swagger-file.yml --angular5-api --dst angular/app/src/api/");
    console.log("");
});
if (!program.swagger) {
    red("--swagger <path> is required");
    program.help();
    process.exit(1);
}
if (!program.angular5Api && !program.mongoose && !program.express && !program.angular5FormTemplate) {
    red("At least one TARGET is required");
    program.help();
    process.exit(1);
}
// parse and aggregate definitions files
let api;
let dstPath = program.dst;
program.swagger.forEach((swagger) => {
    if (api) {
        api.aggregate(Api_1.Api.parseSwaggerFile(swagger), !!program.overrideMethods, !!program.overrideModels);
    }
    else {
        api = Api_1.Api.parseSwaggerFile(swagger);
        if (!dstPath) {
            dstPath = path.dirname(swagger);
        }
    }
});
const projectGenerators = [];
// create all projectGenerators
// some generator may modify api metadata
projectGenerators.push(new Common_1.Common(dstPath, api));
if (program.angular5Api) {
    green("Instancing generator: angular5-api");
    projectGenerators.push(new Angular5Client_1.Angular5Client(dstPath, api));
}
if (program.express) {
    green("Instancing generator: express");
    projectGenerators.push(new Express_1.Express(dstPath, api));
}
// NOTE express need to be before mongoose
if (program.mongoose) {
    green("Instancing generator: mongoose");
    projectGenerators.push(new Mongoose_1.Mongoose(dstPath, api));
}
// then generate all with a common api source
if (projectGenerators.length > 1) {
    green("Start generation");
    projectGenerators.forEach((g) => {
        g.generate(true, !!program.lint);
    });
    // file generators
}
else if (program.angular5FormTemplate) {
    const t = new Angular5FormTemplate_1.Angular5FormTemplate(api);
    green("Generate Angular 5 template");
    t.generate(program.angular5FormTemplate, program.file);
}
//# sourceMappingURL=nema.js.map