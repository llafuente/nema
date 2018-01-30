"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Parameter_1 = require("./Parameter");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
function mkdirSafe(folder) {
    try {
        fs.mkdirSync(folder);
    }
    catch (e) {
        if (e.code != "EEXIST")
            throw e;
    }
}
class Generator {
    static angular5(api, dstPath) {
        mkdirSafe(path.join(dstPath));
        mkdirSafe(path.join(dstPath, "src"));
        mkdirSafe(path.join(dstPath, "src/models"));
        mkdirSafe(path.join(dstPath, "src/resolve"));
        api.eachModel((model, modelName) => {
            Generator.modelFile(api, model, path.join(dstPath, `src/models/${modelName}.ts`));
        });
        api.eachResolve((method, modelName) => {
            Generator.resolveFile(api, method, path.join(dstPath, `src/resolve/${method.resolve.name}.ts`));
        });
        Generator.templates(path.join(dstPath, "src"));
        fs.copyFileSync(path.join(process.cwd(), "templates", "tsconfig.json"), path.join(dstPath, "tsconfig.json"));
        Generator.moduleFile(api, path.join(dstPath, `index.ts`));
        Generator.apiFile(api, path.join(dstPath, `src/${api.apiName}.ts`));
        Generator.packageJSONFile(api, path.join(dstPath, `package.json`));
        Generator.pretty(dstPath);
        //Generator.lint(`./test/generated/src/models/*.ts`);
        //Generator.lint(`./test/generated/src/*.ts`);
        //Generator.lint(`./test/generated/*.ts`);
        Generator.lint(dstPath);
    }
    static pretty(dstPath) {
        child_process_1.spawnSync(path.join(process.cwd(), "node_modules/.bin/prettier.cmd"), ["--write", "--parser", "typescript", dstPath + "/**/*.ts"], {
            cwd: process.cwd(),
            env: process.env,
            shell: true,
            stdio: 'inherit'
        });
    }
    static lint(dstPath) {
        child_process_1.spawnSync(path.join(process.cwd(), "node_modules/.bin/tslint.cmd"), ["-c", "./tslint.json", "--project", path.join(dstPath + "/tsconfig.json"), "--fix"], {
            cwd: process.cwd(),
            env: process.env,
            shell: true,
            stdio: 'inherit'
        });
    }
    static templates(dstPath) {
        ["Cast.ts", "CommonException.ts", "IsError.pipe.ts", "Random.ts", "ApiBase.ts"].forEach((filename) => {
            //const c = fs.readFileSync(path.join(process.cwd(), "templates", filename), { encoding: "utf8"});
            //fs.writeFileSync(path.join(dstPath, filename), c, { encoding: "utf8" });
            fs.copyFileSync(path.join(process.cwd(), "templates", filename), path.join(dstPath, filename));
        });
    }
    static modelFile(api, model, filename) {
        fs.writeFileSync(filename, Generator.model(api, model));
    }
    static resolveFile(api, method, filename) {
        fs.writeFileSync(filename, Generator.resolve(api, method));
    }
    static moduleFile(api, filename) {
        fs.writeFileSync(filename, Generator.module(api));
    }
    static apiFile(api, filename) {
        fs.writeFileSync(filename, Generator.api(api));
    }
    static packageJSONFile(api, filename) {
        fs.writeFileSync(filename, Generator.packageJSON(api));
    }
    static model(api, model) {
        const s = [];
        s.push(`import { Random } from "../Random";\nimport { Cast } from "../Cast";`);
        //import extended model if needed
        if (model.extends) {
            s.push(`import { ${model.extends} } from "./${model.extends}";`);
        }
        // import used models
        const models = [];
        if (model.extends) {
            model.eachParentProperty((t, name) => {
                // not-primitive & unique
                if (!t.isPrimitive() && models.indexOf(t.toBaseType()) === -1) {
                    models.push(t.toBaseType());
                    s.push(`import { ${t.toBaseType()} } from "./${t.toBaseType()}";`);
                }
            });
        }
        model.eachProperty((t, name) => {
            if (!t.isPrimitive() && models.indexOf(t.toBaseType()) === -1) {
                models.push(t.toBaseType());
                s.push(`import { ${t.toBaseType()} } from "./${t.toBaseType()}";`);
            }
        });
        // start interface
        s.push(`export interface ${model.interfaceName} {`);
        _.each(model.type.properties, (t, name) => {
            s.push(`${name}: ${t.toTypeScriptType()},`);
        });
        s.push(`}`);
        // end interface
        // start class
        s.push(`export class ${model.name} ${model.extends ? "extends " + model.extends : ""} implements ${model.interfaceName} {`);
        _.each(model.type.properties, (t, name) => {
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
            if (t.type == "array") {
                parseNewParams.push(`(json.${name} || []).map((x) => ${t.items.toTypeScriptType()}.parse(x)),`);
                emptyInstanceNewParams.push(`[],`);
                randomInstanceNewParams.push(`[],`);
            }
            else if (t.isPrimitive()) {
                parseNewParams.push(`Cast.${t.type}(json.${name}),`);
                emptyInstanceNewParams.push(`null,`);
                randomInstanceNewParams.push(`Random.${t.type}(),`);
            }
            else {
                parseNewParams.push(`${t.toTypeScriptType()}.parse(json.${name}),`);
                emptyInstanceNewParams.push(`${t.toTypeScriptType()}.emptyInstance(),`);
                randomInstanceNewParams.push(`${t.toTypeScriptType()}.randomInstance(),`);
            }
        }
        if (model.extends) {
            model.eachParentProperty(addParams);
        }
        model.eachProperty(addParams);
        s.push(`static parse(json: any): ${model.name} {`);
        s.push(`  return new ${model.name}(`);
        s.push(`  ${parseNewParams.join("\n")}`);
        s.push(`  );`);
        s.push(`}`);
        s.push(`static randomInstance(): ${model.name} {`);
        s.push(`  return new ${model.name}(`);
        s.push(`  ${randomInstanceNewParams.join("\n")}`);
        s.push(`  );`);
        s.push(`}`);
        s.push(`static emptyInstance(): ${model.name} {`);
        s.push(`  return new ${model.name}(`);
        s.push(`  ${emptyInstanceNewParams.join("\n")}`);
        s.push(`  );`);
        s.push(`}`);
        s.push(`}`);
        return s.join("\n");
    }
    static module(api) {
        const s = [
            `import { NgModule, InjectionToken } from "@angular/core";`,
            `import { HttpClientModule, HTTP_INTERCEPTORS, HttpInterceptor } from "@angular/common/http";`,
            `export { CommonException } from "./src/CommonException";`,
            `import { IsErrorPipe } from "./src/IsError.pipe";`,
            `import { ${api.apiName} } from "./src/${api.apiName}";`,
        ];
        api.eachModel((model, modelName) => {
            s.push(`export { ${modelName} } from "./src/models/${modelName}";`);
        });
        s.push(`
@NgModule({
  imports: [
    HttpClientModule
  ],
  declarations: [
    IsErrorPipe,
  ],
  providers: [
    ${api.apiName}
  ],
  exports: [
    IsErrorPipe,
  ]
})
export class ${api.angularModuleName} {}
`);
        return s.join("\n");
    }
    static resolve(api, method) {
        if (method.getResponse(200).type.type == "void") {
            throw new Error("cannot create a resolve of a void method");
        }
        // api call parameters
        const apiParameters = [];
        function addParam(param) {
            apiParameters.push(`this.getParameter(route, ${JSON.stringify(method.resolve.parameters[param.name])}),`);
        }
        method.eachPathParam(addParam);
        method.eachHeaderParam(addParam, true);
        method.eachQueryParam(addParam);
        method.eachBodyParam(addParam);
        return `
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { ActivatedRouteSnapshot, Resolve } from "@angular/router";
import { Observable } from "rxjs/Rx";
import { ${api.apiName} } from "../${api.apiName}";
import { ${method.getResponse(200).type.toTypeScriptType()} } from "../models/${method.getResponse(200).type.toTypeScriptType()}";

@Injectable()
export class ${method.resolve.name} implements Resolve<${method.getResponse(200).type.toTypeScriptType()}> {

  constructor(
    private api: ${api.apiName},
    private router: Router
  ) {
  }

  resolve(route: ActivatedRouteSnapshot) {
    console.info("resolve: ${method.operationId}");

    const x = this.api.${method.operationId}(${apiParameters.join(",")});

    x.subscribe((response) => {
      return response;
    }, (err) => {
      this.router.navigate([${JSON.stringify(method.resolve.errorURL)}]);
    });

    return x;
  }

  getParameter(snapshot: ActivatedRouteSnapshot, key: string): any {
    do {
      const d = snapshot.params as any;
      // console.log("route.params", snapshot.params);
      if (d && d[key] !== undefined) {
        return d[key];
      }

      snapshot = snapshot.parent;
    } while (snapshot);

    return null;
  }
}
`;
    }
    static api(api) {
        const s = [
            `import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Subject, Observable } from "rxjs";
import { ApiBase } from "./ApiBase";
import { CommonException } from "./CommonException";`,
        ];
        // import all models
        api.eachModel((model, modelName) => {
            s.push(`import { ${modelName} } from "./models/${modelName}";`);
        });
        // Api class
        s.push(`@Injectable()
export class ${api.apiName} extends ApiBase {
  scheme: string = ${JSON.stringify(api.schemes[0])};
  debug: boolean = false;
  basePath: string = ${JSON.stringify(api.basePath)};
  host: string = ${JSON.stringify(api.host)};
  getValidSchemes(): string[] {
    return ${JSON.stringify(api.schemes)};
  }
`);
        api.eachMethod((method) => {
            //console.log(method.operationId);
            // Verb
            s.push(`${method.operationId}Verb: string  = ${JSON.stringify(method.verb.toUpperCase())};`);
            s.push(`${method.operationId}URI: string  = ${JSON.stringify(method.url)};`);
            const pathParams = [];
            const pathParamsNames = [];
            const queryParamsCheck = [];
            const queryParamsNames = [];
            const pathParamsReplace = [];
            const headerParams = [];
            const queryParams = [];
            const bodyParams = [];
            method.eachPathParam((p) => {
                pathParams.push(`${p.name}: ${p.type.toTypeScriptType()},`);
                pathParamsNames.push(`${p.name}`);
                pathParamsReplace.push(`.replace("{${p.name}}", ${p.name}.toString())`);
            });
            method.eachQueryParam((p) => {
                queryParams.push(`${p.name}: ${p.type.toTypeScriptType()},`);
                queryParamsNames.push(`${p.name}`);
                queryParamsCheck.push(`
        if (${p.name} !== null) {
            $params = $params.set(${JSON.stringify(p.name)}, ${p.name}.toString())
        }
        `);
            });
            method.eachHeaderParam((p) => {
                headerParams.push(`${p.name}: ${p.type.toTypeScriptType()},`);
            }, true);
            method.eachBodyParam((p) => {
                bodyParams.push(`${p.name}: ${p.type.toTypeScriptType()},`);
            });
            // .replace(/\+/g, '%2B'); fix: + handling that it's bugged in Angular 5
            // keep an eye in the thread to see if fix is merged, may collide with the
            // workaround
            // https://github.com/angular/angular/issues/11058
            s.push(`
      ${method.operationId}URL(
        ${pathParams.join("\n")}
        ${queryParams.join("\n")}
      ): string {
        let $params = new HttpParams();
        ${queryParamsCheck.join("\n")}

        const $url = this.getFullURL(this.${method.operationId}URI)
        ${pathParamsReplace.join("\n")};

        return $url + "?" + $params.toString().replace(/\+/g, '%2B');
      }

      ${method.operationId}(
        ${pathParams.join("\n")}
        ${queryParams.join("\n")}
        ${headerParams.join("\n")}
        ${bodyParams.join("\n")}
      ): Subject<${method.getResponse(200).type.toTypeScriptType()}|CommonException> {`);
            const hasHeaders = method.consumes.length || method.countParams(Parameter_1.ParameterType.HEADER);
            if (hasHeaders) {
                s.push(`let $headers = new HttpHeaders();`);
                // TODO this need to be reviewed, to choose one, our APIs just have one and this works...
                if (method.consumes.length) {
                    s.push(`$headers = $headers.append("Content-Type", ${JSON.stringify(method.consumes)});`);
                }
                method.eachHeaderParam((param) => {
                    s.push(`
            if (${param.name} != null) {
              $headers = $headers.append("${param.headerName || param.name}", ${param.name});
            }
          `);
                }, true);
            }
            s.push(`const $url: string = this.${method.operationId}URL(${pathParamsNames.concat(queryParamsNames).join(",")});`);
            /*
      
             Nasty thing below...
             this.http.get() need to be used for "text" response
             this.http.get<type>() need to be used for "json" response
      
             also the responseType literal need to be casted to itself: "text" as "text"
      
            */
            s.push(`const $options = {`);
            if (hasHeaders) {
                s.push(`headers: $headers,`);
            }
            if (method.producesJSON()) {
                s.push(`responseType: "json" as "json",`);
            }
            if (method.producesText()) {
                s.push(`responseType: "text" as "text",`);
            }
            s.push(`withCredentials: true // enable CORS
      }`);
            const httpParams = ["$url"];
            /* undefined as second paramater if no body parameter found! */
            if (method.requireBody()) {
                if (method.countParams(Parameter_1.ParameterType.BODY) == 0) {
                    httpParams.push("undefined");
                }
                else {
                    // TODO REVIEW This should be just one!!!
                    method.eachBodyParam((p) => {
                        httpParams.push(p.name);
                    });
                }
            }
            httpParams.push("$options");
            if (method.producesJSON()) {
                s.push(`const observable = this.http.${method.verb}<${method.getResponse(200).type.toTypeScriptType()}>(${httpParams.join(",")});`);
            }
            else {
                s.push(`const observable = this.http.${method.verb}(${httpParams.join(",")});`);
            }
            s.push(`
        const ret = new Subject<${method.getResponse(200).type.toTypeScriptType()}|CommonException>();
        observable.subscribe((response) => {
          console.info(\`${method.verb.toUpperCase()}:\${$url}\`, response);

          ret.next(response);
          ret.complete();
        }, (response) => {
          console.error(\`${method.verb.toUpperCase()}:\${$url}\`, response);
          const error = CommonException.parse(response);

          ret.next(error);
          ret.complete();

          // notify global error handler
          this.onError.next(error);
        });

        return ret;
      }\n`);
        });
        s.push(`}`);
        return s.join("\n");
    }
    static packageJSON(api) {
        return JSON.stringify({
            "name": api.nodeModuleName,
            "version": api.version,
            "description": api.description,
            "author": {
                "name": api.authorName,
                "email": api.authorEmail,
                "url": api.authorURL,
            },
            "peerDependencies": {
                "@angular/core": ">=5.2.0",
                "typescript": "*"
            },
            "main": "./index.ts"
        }, null, 2);
    }
}
exports.Generator = Generator;
//# sourceMappingURL=Generator.js.map