#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("./Api");
const Generator_1 = require("./Generator");
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
    .option("--override-models", "Override all models while agreggating")
    .option("--override-methods", "Override all methods while agreggating")
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
if (!program.angular5Api) {
    red("no target to generate");
    process.exit(1);
}
if (program.angular5Api) {
    green("Generating: Angular5");
    let api;
    let dstPath;
    program.swagger.forEach((swagger) => {
        if (api) {
            api.aggregate(Api_1.Api.parseSwaggerFile(swagger), !!program.overrideMethods, !!program.overrideModels);
        }
        else {
            api = Api_1.Api.parseSwaggerFile(swagger);
            dstPath = path.dirname(swagger);
        }
    });
    Generator_1.Generator.angular5(api, dstPath);
}
//# sourceMappingURL=nema.js.map