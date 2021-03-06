"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
const TypescriptFile_1 = require("../TypescriptFile");
function getTypeScriptZoneRE(token) {
    const startToken = `//<${token}>`;
    const endToken = `//</${token}>`;
    const re = new RegExp(`${startToken.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}(.|[\\r\\n])*${endToken.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}`, "m");
    return re;
}
function getHTMLZoneRE(token) {
    const startToken = `<!--${token}-->`;
    const endToken = `<!--/${token}-->`;
    const re = new RegExp(`${startToken.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}(.|[\\r\\n])*${endToken.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}`, "m");
    return re;
}
function copyZonedTemplate(srcFile, dstFile, tokens) {
    writeZonedTemplate(dstFile, {
        tokens: tokens,
        template: fs.readFileSync(srcFile).toString(),
    });
}
exports.copyZonedTemplate = copyZonedTemplate;
function setZonedTemplate(srcFile, token, text) {
    const template = fs.readFileSync(srcFile).toString();
    const re = getTypeScriptZoneRE(token);
    const m = template.match(re);
    if (m !== null) {
        const finalTemplate = template.replace(m[0], `//<${token}>\n${text}\n//</${token}>`);
        fs.writeFileSync(srcFile, finalTemplate);
    }
}
exports.setZonedTemplate = setZonedTemplate;
function writeZonedTemplate(filename, tpl) {
    let contents = null;
    let template = tpl.template;
    try {
        contents = fs.readFileSync(filename).toString();
    }
    catch (err) {
        if (err.code != "ENOENT") {
            console.error(err);
        }
    }
    if (contents) {
        tpl.tokens.forEach((token) => {
            let re;
            switch (path.extname(filename)) {
                case ".ts":
                    re = getTypeScriptZoneRE(token);
                    break;
                case ".html":
                    re = getHTMLZoneRE(token);
                    break;
                default:
                    throw new Error(`unhandled zone file: ${filename}`);
            }
            const m = contents.match(re);
            // console.log(startToken, endToken);
            // console.log(re);
            // console.log("contents");
            // console.log(contents);
            // console.log("------------------------");
            // console.log(m);
            if (m !== null) {
                //const tokenContents = m[0].substr(startToken.length, m[0].length - startToken.length - endToken.length);
                template = template.replace(re, m[0]);
            }
        });
    }
    fs.writeFileSync(filename, template);
}
exports.writeZonedTemplate = writeZonedTemplate;
function pretty(api, dstPath) {
    child_process_1.spawnSync(path.join(api.root, "node_modules/.bin/prettier.cmd"), [
        "--write",
        "--parser",
        "typescript",
        JSON.stringify(path.join(dstPath, "**/*.ts")),
        "--ignore-path",
        JSON.stringify(path.join(dstPath, "node_modules/*")),
    ], {
        cwd: process.cwd(),
        env: process.env,
        shell: true,
        stdio: "inherit",
    });
}
exports.pretty = pretty;
function lint(api, dstPath) {
    child_process_1.spawnSync(path.join(api.root, "node_modules/.bin/tslint.cmd"), ["-c", "./tslint.json", "--project", JSON.stringify(path.join(dstPath + "/tsconfig.json")), "--fix"], {
        cwd: process.cwd(),
        env: process.env,
        shell: true,
        stdio: "inherit",
    });
}
exports.lint = lint;
function copyCommonTemplates(api, dstPath) {
    ["Cast.ts", "Random.ts"].forEach((filename) => {
        fs.copyFileSync(path.join(api.root, "templates", filename), path.join(dstPath, "src", filename));
    });
    fs.copyFileSync(path.join(api.root, "templates", "tslint.json"), path.join(dstPath, "tslint.json"));
}
exports.copyCommonTemplates = copyCommonTemplates;
function models(api, dstPath) {
    api.eachModel((mdl, modelName) => {
        fs.writeFileSync(path.join(dstPath, "." + mdl.filename), generateModel(api, mdl, mdl.filename));
    });
    api.eachEnum((mdl, modelName) => {
        fs.writeFileSync(path.join(dstPath, "." + mdl.filename), generateEnum(api, mdl));
    });
}
exports.models = models;
function generateModel(api, model, filename) {
    const ts = new TypescriptFile_1.TypescriptFile();
    ts.header = "// DO NOT EDIT THIS FILE\n";
    //import extended model if needed
    if (model.extends) {
        const ex = model.api.getReference(model.extends);
        ts.addImport(ex.name, ex.filename);
    }
    ts.push(modelInterface(api, model, ts));
    ts.push(modelClass(api, model, ts));
    return ts.toString(filename);
}
exports.generateModel = generateModel;
function modelInterface(api, model, ts) {
    // start interface
    const s = [`export interface ${model.interfaceName} {`];
    _.each(model.type.properties, (t, name) => {
        s.push(`${name}: ${t.toTypeScriptType()},`);
    });
    s.push(`}`);
    // end interface
    return s.join("\n");
}
exports.modelInterface = modelInterface;
function modelClass(api, model, ts) {
    const s = [];
    let ex = null;
    if (model.extends) {
        ex = model.api.getReference(model.extends);
    }
    // start class
    s.push(`export class ${model.name} ${model.extends ? "extends " + ex.name : ""} implements ${model.interfaceName} {`);
    model.eachProperty((t, name) => {
        s.push(`${name}: ${t.toTypeScriptType()};`);
    });
    const constructorParams = [];
    const constructorBody = [];
    //super for extended classes
    if (model.extends) {
        // parent properties
        constructorBody.push(`super(`);
        model.eachParentProperty((t, name) => {
            constructorParams.push(`${name}: ${t.toTypeScriptType()},`);
            constructorBody.push(`${name},`);
        });
        constructorBody.push(`);`);
    }
    // own properties
    model.eachProperty((t, name) => {
        constructorParams.push(`${name}: ${t.toTypeScriptType()},`);
        constructorBody.push(`this.${name} = ${name};`);
    });
    s.push(`constructor(${constructorParams.join("\n")}) {\n${constructorBody.join("\n")}\n}`);
    // end constructor
    // start parse/randomInstance/emptyInstance methods
    const parseNewParams = [];
    const randomInstanceNewParams = [];
    const emptyInstanceNewParams = [];
    function addParams(t, name) {
        parseNewParams.push(t.getParser(`json.${name}`, ts));
        randomInstanceNewParams.push(t.getRandom(ts));
        emptyInstanceNewParams.push(t.getEmptyValue());
    }
    if (model.extends) {
        model.eachParentProperty(addParams);
    }
    model.eachProperty(addParams);
    s.push(`
    static parse(json: any): ${model.name} {
      if (json == null) {
        return ${model.name}.emptyInstance();
      }

      return new ${model.name}(
      ${parseNewParams.join(",\n")}
      );
    }

    static randomInstance(): ${model.name} {
      return new ${model.name}(
      ${randomInstanceNewParams.join(",\n")}
      );
    }

    static emptyInstance(): ${model.name} {
      return new ${model.name}(
      ${emptyInstanceNewParams.join(",\n")}
      );
    }`);
    // getters and setters
    model.eachProperty((t, name) => {
        const ucase = name[0].toLocaleUpperCase() + name.substr(1);
        s.push(`
        get${ucase}(): ${t.toTypeScriptType()} {
          return this.${name};
        }
        set${ucase}($value: ${t.toTypeScriptType()}) {
          this.${name} = $value;
        }
      `);
    });
    s.push(`}`);
    return s.join("\n");
}
exports.modelClass = modelClass;
function generateEnum(api, model) {
    return `export enum ${model.name} {
    ${model.type.choices
        .map((x) => {
        return `${x.toUpperCase()} = ${JSON.stringify(x)}`;
    })
        .join(",\n")}
  }`;
}
exports.generateEnum = generateEnum;
//# sourceMappingURL=CommonGenerator.js.map