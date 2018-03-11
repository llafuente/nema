import { Api } from "../Api";
import { Model } from "../Model";
import { Type } from "../Type";
import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { TypescriptFile } from "../TypescriptFile";

function getTypeScriptZoneRE(token: string) {
  const startToken = `//<${token}>`;
  const endToken = `//</${token}>`;

  const re = new RegExp(
    `${startToken.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}(.|[\\r\\n])*${endToken.replace(
      /[-\/\\^$*+?.()|[\]{}]/g,
      "\\$&",
    )}`,
    "m",
  );
  return re;
}

function getHTMLZoneRE(token: string) {
  const startToken = `<!--${token}-->`;
  const endToken = `<!--/${token}-->`;

  const re = new RegExp(
    `${startToken.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}(.|[\\r\\n])*${endToken.replace(
      /[-\/\\^$*+?.()|[\]{}]/g,
      "\\$&",
    )}`,
    "m",
  );
  return re;
}

export interface ModificableTemplate {
  tokens: string[];
  template: string;
}

export function copyZonedTemplate(srcFile: string, dstFile, tokens: string[]) {
  writeZonedTemplate(dstFile, {
    tokens: tokens,
    template: fs.readFileSync(srcFile).toString(),
  });
}

export function setZonedTemplate(srcFile: string, token: string, text: string) {
  const template = fs.readFileSync(srcFile).toString();
  const re = getTypeScriptZoneRE(token);
  const m = template.match(re);

  if (m !== null) {
    const finalTemplate = template.replace(m[0], `//<${token}>\n${text}\n//</${token}>`);

    fs.writeFileSync(srcFile, finalTemplate);
  }
}

export function writeZonedTemplate(filename: string, tpl: ModificableTemplate) {
  let contents: string = null;
  let template = tpl.template;
  try {
    contents = fs.readFileSync(filename).toString();
  } catch (err) {
    if (err.code != "ENOENT") {
      console.error(err);
    }
  }

  if (contents) {
    tpl.tokens.forEach((token) => {
      let re;
      switch(path.extname(filename)) {
        case ".ts":
          re = getTypeScriptZoneRE(token);
        break;
        case ".html":
          re = getHTMLZoneRE(token);
        break;
        default:
        throw new Error(`unhandled zone file: ${filename}`)
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

export function pretty(dstPath: string) {
  spawnSync(
    path.join(process.cwd(), "node_modules/.bin/prettier.cmd"),
    [
      "--write",
      "--parser",
      "typescript",
      JSON.stringify(path.join(dstPath, "**/*.ts")), // fix whitespace
      "--ignore-path",
      JSON.stringify(path.join(dstPath, "node_modules/*")),
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      shell: true,
      stdio: "inherit",
    },
  );
}

export function lint(dstPath: string) {
  spawnSync(
    path.join(process.cwd(), "node_modules/.bin/tslint.cmd"),
    ["-c", "./tslint.json", "--project", JSON.stringify(path.join(dstPath + "/tsconfig.json")), "--fix"],
    {
      cwd: process.cwd(),
      env: process.env,
      shell: true,
      stdio: "inherit",
    },
  );
}

export function copyCommonTemplates(dstPath: string) {
  ["Cast.ts", "CommonException.ts", "Random.ts"].forEach((filename) => {
    fs.copyFileSync(path.join(process.cwd(), "templates", filename), path.join(dstPath, "src", filename));
  });
  fs.copyFileSync(path.join(process.cwd(), "templates", "tslint.json"), path.join(dstPath, "tslint.json"));
}

export function models(api: Api, dstPath: string) {
  api.eachModel((mdl, modelName) => {
    fs.writeFileSync(path.join(dstPath, "." + mdl.filename), generateModel(api, mdl, mdl.filename));
  });

  api.eachEnum((mdl, modelName) => {
    fs.writeFileSync(path.join(dstPath, "." + mdl.filename), generateEnum(api, mdl));
  });
}

export function generateModel(api: Api, model: Model, filename: string): string {
  const ts = new TypescriptFile();
  ts.header = "// DO NOT EDIT THIS FILE\n";

  //import extended model if needed
  if (model.extends) {
    const ex = model.api.getReference(model.extends) as Model;
    ts.addImport(ex.name, ex.filename);
  }

  ts.push(modelInterface(api, model, ts));
  ts.push(modelClass(api, model, ts));

  return ts.toString(filename);
}

export function modelInterface(api: Api, model: Model, ts: TypescriptFile): string {
  // start interface
  const s = [`export interface ${model.interfaceName} {`];
  _.each(model.type.properties, (t, name) => {
    s.push(`${name}: ${t.toTypeScriptType()},`);
  });
  s.push(`}`);
  // end interface

  return s.join("\n");
}

export function modelClass(api: Api, model: Model, ts: TypescriptFile): string {
  const s = [];

  let ex: Model = null;
  if (model.extends) {
    ex = model.api.getReference(model.extends) as Model;
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

  function addParams(t: Type, name: string) {
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
  model.eachProperty((t: Type, name: string) => {
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

export function generateEnum(api: Api, model: Model): string {
  return `export enum ${model.name} {
    ${model.type.choices
      .map((x) => {
        return `${x.toUpperCase()} = ${JSON.stringify(x)}`;
      })
      .join(",\n")}
  }`;
}
