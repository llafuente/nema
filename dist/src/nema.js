#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("./Api");
const Generator_1 = require("./Generator");
const path = require("path");
const program = require("commander");
const chalk = require("chalk");
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
    .version("x.x.x")
    .description("Generate API from swagger")
    .option("--angular5-api", "TARGET: Angular 5 Api client")
    .option("--swagger [path]", "Path to swagger yml", function (val, memo) {
    memo.push(val);
    return memo;
}, [])
    .parse(process.argv);
console.log(program);
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
        }
        else {
            api = Api_1.Api.parseSwaggerFile(swagger);
            dstPath = path.dirname(swagger);
        }
    });
    Generator_1.Generator.angular5(api, dstPath);
}
//# sourceMappingURL=nema.js.map