#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const chalk = require("chalk");
const path = require("path");
const nova = require("../");
const fs = require("fs");
const spawn = require("child_process").spawnSync;
const inquirer = require("inquirer");
const async = require("async");
const request = require("request");
// controllerservernova
const GENERATOR_URL = "http://liprd622.igrupobbva:37025/api/generate/swagger";
const UID = "" + Math.floor(Math.random() * 100000000); // "1505381533440_767";
/*
node .\bin\nova.js api --yml=C:\bbva\starter\nova-cli\tmp\initiativesapi.yml
node .\bin\nova.js api --yml=C:\bbva\autohedgergui\autohedgergui\thin2-fe\src\api\AlgoFramework.yaml
*/
program
    .version(nova.version)
    .description("Generate API from swagger")
    .option("--yml [path]", "Path to swagger yml", function (val, memo) {
    memo.push(val);
    return memo;
}, [])
    .parse(process.argv);
if (!program.yml) {
    nova.red("--yml [path] is required");
    process.exit(1);
}
inquirer.prompt([{
        type: 'checkbox',
        message: 'Choose targets to generate (at least one)',
        name: 'targets',
        choices: [
            new inquirer.Separator(' = BACKED = '),
            {
                name: "client.feign.nova",
            }, {
                name: "server.spring.nova",
            },
            new inquirer.Separator(' = FRONTEND = '),
            {
                name: "client.angular2",
            },
            {
                name: "client.angular2.next",
                checked: true
            },
        ],
        validate: function (answer) {
            if (answer.length < 1) {
                return 'You must choose at least target.';
            }
            return true;
        }
    }])
    .then((answers) => {
    const fileData = path.parse(program.yml[0]);
    const apiName = fileData.name;
    nova.green("Selected targets: ", answers.targets.join(", "));
    async.eachSeries(answers.targets, (target, next) => {
        const outputFile = path.join(fileData.dir, `${apiName}-${target}.zip`);
        nova.green(`Generating ${target} from YML ${program.yml} TO ${outputFile}`);
        if (fs.existsSync(outputFile)) {
            nova.red(`skip ${outputFile}`);
            return next();
        }
        nova.green(`fetching ${target}`);
        if ("client.angular2.next" === target) {
            generateAngular2(fileData, outputFile, program.yml, next);
        }
        else {
            if (program.yml.length > 1) {
                nova.red(`aggregation not supportted for target: ${target}`);
                return next();
            }
            const YML_CONTENTS = fs.readFileSync(program.yml[0]);
            request.post({
                url: `${GENERATOR_URL}/?randomIdentifier=${UID}&fileName=${fileData.base}&translatorType=${target}`,
                //method: "POST",
                encoding: null,
                //form: {
                formData: {
                    specificationContent: YML_CONTENTS
                }
            })
                .on('response', function (response) {
                //console.log("response.statusCode:", response.statusCode);
            })
                .on('end', function () {
                next();
            })
                .pipe(fs.createWriteStream(outputFile));
        }
    }, (err) => {
        if (err) {
            nova.green("errors found");
            throw err;
        }
        // TODO
        nova.green("done");
    });
});
function generateAngular2(fileData, outputFile, ymlFiles, next) {
}
//# sourceMappingURL=nema.js.map