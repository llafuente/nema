#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("./Api");
const Angular5Client_1 = require("./generators/Angular5Client");
const Mongoose_1 = require("./generators/Mongoose");
const Express_1 = require("./generators/Express");
const path = require("path");
const program = require("commander");
const packageJSON = require(path.join(__dirname, "..", "..", "package.json"));
const chalk = require("chalk");
console.log(`
 _  _  _ _  _
| |(/_| | |(_|${packageJSON.version}
`);
function green(text) {
    console.log(chalk.green.bold(text));
}
function red(text) {
    console.log(chalk.red.bold(text));
}
function blue(text) {
    console.log(chalk.cyanBright(text));
}
function yellow(text) {
    console.log(chalk.yellowBright(text));
}
/*
node .\bin\js api --yml=C:\bbva\starter\nova-cli\tmp\initiativesapi.yml
node .\bin\js api --yml=C:\bbva\autohedgergui\autohedgergui\thin2-fe\src\api\AlgoFramework.yaml
*/
program
    .version(packageJSON.version)
    .description("Code generation from swagger")
    .option("--angular5-api", "TARGET: Generate an Angular 5 Module Api client")
    .option("--mongoose", "TARGET: Generate Mongoose models and CRUD classes")
    .option("--express", "TARGET: Generate Express app/routes")
    .option("--override-models", "Override all models while agreggating")
    .option("--override-methods", "Override all methods while agreggating")
    .option("--lint", "Lint output, this may take a while")
    .option("--swagger [path]", "Path to swagger yml, repeat to aggregate", function (val, memo) {
    memo.push(val);
    return memo;
}, [])
    .parse(process.argv);
if (!program.swagger) {
    red("--swagger [path] is required");
    process.exit(1);
}
// TODO add more targets!!
if (!program.angular5Api && !program.mongoose && !program.express) {
    red("no target to generate");
    process.exit(1);
}
let api;
let dstPath;
program.swagger.forEach((swagger) => {
    if (api) {
        api.aggregate(Api_1.Api.parseSwaggerFile(swagger, !!program.mongoose), !!program.overrideMethods, !!program.overrideModels);
    }
    else {
        api = Api_1.Api.parseSwaggerFile(swagger, !!program.mongoose);
        dstPath = path.dirname(swagger);
    }
});
//console.log(api);
//process.exit(0);
if (program.angular5Api) {
    green("Generating: Angular5");
    (new Angular5Client_1.Angular5Client(dstPath, api)).generate(true, !!program.lint);
}
if (program.mongoose) {
    green("Generating: Mongoose");
    Mongoose_1.Mongoose.generate(api, dstPath, true, !!program.lint);
}
if (program.express) {
    green("Generating: Express");
    (new Express_1.Express(dstPath, api)).generate(true, !!program.lint);
}
//# sourceMappingURL=nema.js.map