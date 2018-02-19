"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Parameter_1 = require("../Parameter");
const fs = require("fs");
const path = require("path");
const CommonGenerator = require("./CommonGenerator");
const TypescriptFile_1 = require("../TypescriptFile");
function mkdirSafe(folder) {
    try {
        fs.mkdirSync(folder);
    }
    catch (e) {
        if (e.code != "EEXIST")
            throw e;
    }
}
class Angular5Client {
    constructor(dstPath) {
        this.dstPath = dstPath;
    }
    generate(api, pretty, lint) {
        api.sort();
        // create generation paths
        mkdirSafe(path.join(this.dstPath));
        mkdirSafe(path.join(this.dstPath, "src"));
        mkdirSafe(path.join(this.dstPath, "src/models"));
        mkdirSafe(path.join(this.dstPath, "src/resolve"));
        // generate all models
        CommonGenerator.models(api, this.dstPath);
        // copy raw files (those that don't need to be generated)
        CommonGenerator.copyCommonTemplates(this.dstPath);
        fs.copyFileSync(path.join(process.cwd(), "templates", "angular5client", "tsconfig.json"), path.join(this.dstPath, "tsconfig.json"));
        fs.copyFileSync(path.join(process.cwd(), "templates", "angular5client", "IsError.pipe.ts"), path.join(this.dstPath, "src", "IsError.pipe.ts"));
        fs.copyFileSync(path.join(process.cwd(), "templates", "angular5client", "RequestOptions.ts"), path.join(this.dstPath, "src", "RequestOptions.ts"));
        // generate all resolves
        api.eachResolve((method, modelName) => {
            this.resolveFile(api, method, `/src/resolve/${method.resolve.name}.ts`);
        });
        this.apiFile(api, `/src/${api.apiName}.ts`);
        this.moduleFile(api, `/index.ts`);
        this.packageJSONFile(api, `/package.json`);
        if (pretty) {
            CommonGenerator.pretty(this.dstPath);
        }
        // this may take a long time...
        if (lint) {
            CommonGenerator.lint(this.dstPath);
        }
    }
    header(api) {
        return "// DO NOT EDIT THIS FILE\n";
    }
    resolveFile(api, method, filename) {
        fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.resolve(api, method));
    }
    moduleFile(api, filename) {
        fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.module(api));
    }
    apiFile(api, filename) {
        fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.api(api, filename));
    }
    packageJSONFile(api, filename) {
        fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.packageJSON(api));
    }
    module(api) {
        const s = [
            this.header(api),
            `import { NgModule, InjectionToken } from "@angular/core";
import { HttpClientModule, HTTP_INTERCEPTORS, HttpInterceptor } from "@angular/common/http";
export { CommonException } from "./src/CommonException";
import { IsErrorPipe } from "./src/IsError.pipe";
import { ${api.apiName} } from "./src/${api.apiName}";
export { ${api.apiName} } from "./src/${api.apiName}";
`,
        ];
        api.eachModel((model, modelName) => {
            s.push(`export { ${modelName} } from "./src/models/${modelName}";`);
        });
        const resolves = [];
        api.eachResolve((method, operationId) => {
            s.push(`import { ${method.resolve.name} } from "./src/resolve/${method.resolve.name}";`);
            s.push(`export { ${method.resolve.name} } from "./src/resolve/${method.resolve.name}";`);
            resolves.push(method.resolve.name);
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
    ${api.apiName}, ${resolves.join(",")}
  ],
  exports: [
    IsErrorPipe,
  ]
})
export class ${api.angularClientModuleName} {}
`);
        return s.join("\n");
    }
    resolve(api, method) {
        const responseType = method.getSuccessResponse();
        if (responseType.type.type == "void") {
            throw new Error("cannot create a resolve of a void method");
        }
        // TODO validate parameters - map
        // api call parameters
        const apiParameters = [];
        function addParam(param) {
            apiParameters.push(`this.getParameter(route, ${JSON.stringify(method.resolve.parameters[param.name])})`);
        }
        method.eachPathParam(addParam);
        method.eachHeaderParam(addParam, true);
        method.eachQueryParam(addParam);
        method.eachBodyParam(addParam);
        return `${this.header(api)}
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { ActivatedRouteSnapshot, Resolve } from "@angular/router";
import { Observable } from "rxjs/Rx";
import { ${api.apiName} } from "../${api.apiName}";
import { ${responseType.type.toTypeScriptType()} } from "../models/${responseType.type.toTypeScriptType()}";

@Injectable()
export class ${method.resolve.name} implements Resolve<${responseType.type.toTypeScriptType()}> {

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
    api(api, filename) {
        const ts = new TypescriptFile_1.TypescriptFile();
        ts.header = this.header(api);
        ts.push(`import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Subject, Observable } from "rxjs";`);
        ts.addImport("CommonException", "/src/CommonException.ts");
        ts.addImport("RequestOptions", "/src/RequestOptions.ts");
        // import all models
        api.eachModel((model, modelName) => {
            ts.addImport(model.name, model.filename);
        });
        // Api class
        ts.push(`@Injectable()
export class ${api.apiName} {
  scheme: string = ${JSON.stringify(api.schemes[0])};
  debug: boolean = false;
  basePath: string = ${JSON.stringify(api.basePath)};
  host: string = ${JSON.stringify(api.host)};
  onError: Subject<CommonException> = new Subject<CommonException>();

  constructor(
    public http: HttpClient,
  ) {}

  validSchemes: string[] = ${JSON.stringify(api.schemes)};


  setDebug(d: boolean) {
    this.debug = d;
  }

  setScheme(scheme: string) {
    if (this.validSchemes.indexOf(scheme) === -1) {
      throw new Error(\`Invalid scheme[\${scheme}] must be one of: \${this.validSchemes.join(", ")}\`);
    }
    this.scheme = scheme;
  }

  setHost(host) {
    this.host = host;
  }

  getFullURL(uri: string) : string {
    return \`\${this.scheme}://\` + \`\${this.host}/\${this.basePath}\${uri}\`.replace(${"/\\/\\//g"}, "/");
  }

`);
        api.eachMethod((method) => {
            // Verb
            ts.push(`// source: ${method.api.filename}`);
            ts.push(`${method.operationId}Verb: string  = ${JSON.stringify(method.verb.toUpperCase())};`);
            ts.push(`${method.operationId}URI: string  = ${JSON.stringify(path.posix.join(method.api.frontBasePath || method.api.basePath, method.url))};`);
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
        if (${p.name} != null) {
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
            const responseType = method.getSuccessResponse().type;
            const responseTypeTS = responseType.toTypeScriptType();
            ts.push(`
      ${method.operationId}URL(
        ${pathParams.join("\n")}
        ${queryParams.join("\n")}
      ): string {
        let $params = new HttpParams();
        ${queryParamsCheck.join("\n")}

        const $url = this.getFullURL(this.${method.operationId}URI)
        ${pathParamsReplace.join("\n")};

        return $url + "?" + $params.toString().replace(/\\+/g, '%2B');
      }

      ${method.operationId}(
        ${pathParams.join("\n")}
        ${queryParams.join("\n")}
        ${headerParams.join("\n")}
        ${bodyParams.join("\n")}
        $reqOptions: RequestOptions = null
      ): Subject<${responseTypeTS}> {
        $reqOptions = $reqOptions || { emitError: true };
`);
            const hasHeaders = method.consumes.length || method.countParams(Parameter_1.ParameterType.HEADER, true);
            if (hasHeaders) {
                ts.push(`let $headers = new HttpHeaders();`);
                // TODO this need to be reviewed, to choose one, our APIs just have one and this works...
                if (method.consumes.length) {
                    ts.push(`$headers = $headers.append("Content-Type", ${JSON.stringify(method.consumes)});`);
                }
                method.eachHeaderParam((param) => {
                    ts.push(`
            if (${param.name} != null) {
              $headers = $headers.append("${param.headerName || param.name}", ${param.name});
            }
          `);
                }, true);
            }
            ts.push(`const $url: string = this.${method.operationId}URL(${pathParamsNames.concat(queryParamsNames).join(",")});`);
            /*
             * Nasty thing below...
             * this.http.get() need to be used for "text" response
             * this.http.get<type>() need to be used for "json" response
             *
             * also the responseType literal need to be casted to itself: "text" as "text"
             *
             * In case of errors
             * subject will be null ([], {}, null), otherwise loadings never stop
             * We cannot return CommonException class because if the subject is used
             * in an ngFor will throw errors
             */
            ts.push(`const $options = {`);
            if (hasHeaders) {
                ts.push(`headers: $headers,`);
            }
            if (method.producesJSON()) {
                ts.push(`responseType: "json" as "json",`);
            }
            else if (method.producesText()) {
                ts.push(`responseType: "text" as "text",`);
            }
            else if (method.producesBlob()) {
                ts.push(`responseType: "blob" as "blob",`);
            }
            else if (responseTypeTS != "void") {
                console.log(method, responseTypeTS);
                throw new Error(`invalid produces, only: application/json, text/plain, text/html found: "${method.produces}" at ${method.api.filename}/${method.operationId}`);
            }
            ts.push(`withCredentials: true // enable CORS
      }`);
            const httpParams = ["$url"];
            /* undefined as second paramater if no body parameter found! */
            if (method.requireBody()) {
                if (method.countParams(Parameter_1.ParameterType.BODY, true) == 0) {
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
                ts.push(`const observable = this.http.${method.verb}<${responseType.toTypeScriptType()}>(${httpParams.join(",")});`);
            }
            else {
                ts.push(`const observable = this.http.${method.verb}(${httpParams.join(",")});`);
            }
            ts.push(`
        const ret = new Subject<${responseTypeTS}>();
        observable.subscribe((response: ${responseTypeTS == "void" ? "null" : responseTypeTS}) => {
          console.info(\`${method.verb.toUpperCase()}:\${$url}\`, response);

          ret.next(${responseTypeTS == "void" ?
                "null" :
                responseType.getParser("response", ts)});
          ret.complete();
        }, (response: HttpErrorResponse) => {
          console.error(\`${method.verb.toUpperCase()}:\${$url}\`, response);
          const error = CommonException.parse(response.error);

          ret.next(${responseType.getParser(responseType.getEmptyValue(), ts)}); // force cast
          ret.complete();

          // notify global error handler
          if ($reqOptions.emitError) {
            this.onError.next(error);
          }
        });

        return ret;
      }\n`);
        });
        ts.push(`}`);
        return ts.toString(filename);
    }
    packageJSON(api) {
        return JSON.stringify({
            "name": api.angularClientNodeModuleName,
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
exports.Angular5Client = Angular5Client;
//# sourceMappingURL=Angular5Client.js.map