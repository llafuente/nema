#!/usr/bin/env node

import { Api, parseYML } from "./Api";
import { Angular5Api } from "./generators/Angular5Api";
import { Angular5FormTemplate } from "./generators/Angular5FormTemplate";
import { MongooseApi } from "./generators/MongooseApi";
import { MongooseApp } from "./generators/MongooseApp";
import { ExpressApi } from "./generators/ExpressApi";
import { ExpressApp } from "./generators/ExpressApp";


import * as path from "path";
import * as program from "commander";
const chalk = require("chalk");

const packageJSON = require(path.join(__dirname, "..", "..", "package.json"));

console.log(`
 _  _  _ _  _
| |(/_| | |(_|${packageJSON.version}
`);

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

program
  .version(packageJSON.version)
  .description("Code generation from swagger")

  .option("--angular5-api", "TARGET(project) Generate an Angular 5 Module Api client")

  .option("--mongoose-api", "TARGET(project) Generate Mongoose Schemas, Models & Repositories")
  .option("--mongoose-app", `TARGET(project) Generate Mongoose Express app
require --express-api in the same destination`)

  .option("--express-api", "TARGET(project) Generate Express routes/models")
  .option("--express-app", "TARGET(project) Generate Express app")

  .option("--angular5-form-template <path>", "TARGET(file) Generate an Angular 5 Template from given model")

  .option("--override-models", "Override all models while agreggating")
  .option("--override-methods", "Override all methods while agreggating")
  .option("--lint", "Lint output (tslint), this may take a while")
  .option(
    "--swagger <path>",
    "Path to swagger yml, repeat to aggregate",
    function(val, memo) {
      memo.push(val);
      return memo;
    },
    [],
  )
  .option("--file <path>", "Output path for TARGET(file) path")
  .option("--dst <path>", "Output path for TARGET(project), default: same as the first swagger")
  .parse(process.argv);

program.on("--help", function() {
  console.log("");
  console.log("  At least one swagger file is required");
  console.log("  One TARGET is required");
  console.log("");
  console.log("  Examples:");
  console.log("");
  console.log("  Generate and express with mongoose server");
  console.log("    nema --swagger=swagger-file.yml --express-app --dst server/");
  console.log("    nema --swagger=swagger-file.yml --mongoose-app --express --dst server/");
  console.log("    nema --swagger=swagger-file.yml --express-api --dst server/users/");
  console.log("    nema --swagger=swagger-file.yml --mongoose-api --express --dst server/users");
  console.log("  Generate angular5 client");
  console.log("    nema --swagger=swagger-file.yml --angular5-api --dst angular/app/src/api/");
  console.log("");
});

if (!program.swagger) {
  red("--swagger <path> is required");
  program.help();
  process.exit(1);
}

const targets =
  (program.angular5Api ? 1 : 0) +
  (program.mongooseApi ? 1 : 0) +
  (program.mongooseApp ? 1 : 0) +
  (program.expressApi ? 1 : 0) +
  (program.expressApp ? 1 : 0) +
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

let api: Api;
let dstPath = program.dst;
program.swagger.forEach((swagger) => {
  if (api) {
    api.aggregate(Api.parseSwaggerFile(swagger), !!program.overrideMethods, !!program.overrideModels);
  } else {
    api = Api.parseSwaggerFile(swagger);

    if (!dstPath) {
      dstPath = path.dirname(swagger);
    }
  }
});

//
// add common definitions that need generator need
// TODO: this need to dissapear asap
//
const mongooseSwagger = parseYML(path.join(__dirname, "..", "..", "common.yml"));
api.parseSwaggerDefinitions(mongooseSwagger, true);

const projectGenerators = [];

// create all projectGenerators
// some generator may modify api metadata

if (program.angular5Api) {
  green("Instancing generator: angular5-api");
  new Angular5Api(dstPath, api).generate(true, !!program.lint)
} else if (program.expressApi) {
  green("Instancing generator: express");
  new ExpressApi(dstPath, api).generate(true, !!program.lint)
} else if (program.expressApp) {
  green("Instancing generator: express bootstrap");
  new ExpressApp(dstPath, api).generate(true, !!program.lint)
} else if (program.mongooseApi) {
  green("Instancing generator: mongoose");
  new MongooseApi(dstPath, api).generate(true, !!program.lint)
} else if (program.mongooseApp) {
  green("Instancing generator: mongoose bootstrap");
  new MongooseApp(dstPath, api).generate(true, !!program.lint)
} else if (program.angular5FormTemplate) {
  const t = new Angular5FormTemplate(api);
  green("Generate Angular 5 template");

  t.generate(program.angular5FormTemplate, program.file);
} else {
  // should be here
  throw new Error("wtf?!");
}
