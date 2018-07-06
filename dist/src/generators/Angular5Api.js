"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const CommonGenerator = require("./CommonGenerator");
const TypescriptFile_1 = require("../TypescriptFile");
const mkdirp = require("mkdirp").sync;
const header = "// DO NOT EDIT THIS FILE\n";
class Angular5Api {
    constructor(dstPath, api) {
        this.dstPath = dstPath;
        this.api = api;
    }
    generate(pretty, lint) {
        this.api.sort();
        // create generation paths
        mkdirp(path.join(this.dstPath, "src/models"));
        mkdirp(path.join(this.dstPath, "src/resolve"));
        CommonGenerator.models(this.api, this.dstPath);
        // copy raw files (those that don't need to be generated)
        CommonGenerator.copyCommonTemplates(this.api, this.dstPath);
        fs.copyFileSync(path.join(this.api.root, "templates", "angular5client", "tsconfig.json"), path.join(this.dstPath, "tsconfig.json"));
        fs.copyFileSync(path.join(this.api.root, "templates", "angular5client", "RequestOptions.ts"), path.join(this.dstPath, "src", "RequestOptions.ts"));
        // generate all resolves
        this.api.eachResolve((method, modelName) => {
            this.resolveFile(method, `/src/resolve/${method.resolve.name}.ts`);
        });
        this.indexFile(`/src/${this.api.apiName}.ts`);
        this.moduleFile(`/index.ts`);
        this.packageJSONFile(`/package.json`);
        if (pretty) {
            CommonGenerator.pretty(this.api, this.dstPath);
        }
        // this may take a long time...
        if (lint) {
            CommonGenerator.lint(this.api, this.dstPath);
        }
    }
    resolveFile(method, filename) {
        fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.resolve(method));
    }
    moduleFile(filename) {
        fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.module());
    }
    indexFile(filename) {
        fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.index(filename));
    }
    packageJSONFile(filename) {
        fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.packageJSON());
    }
    module() {
        const s = [
            header,
            `import { NgModule, InjectionToken } from "@angular/core";
import { HttpClientModule, HTTP_INTERCEPTORS, HttpInterceptor } from "@angular/common/http";
import { ${this.api.apiName} } from "./src/${this.api.apiName}";
export { ${this.api.apiName} } from "./src/${this.api.apiName}";
`,
        ];
        this.api.eachModel((model, modelName) => {
            s.push(`export { ${modelName} } from "./src/models/${modelName}";`);
        });
        this.api.eachEnum((model, modelName) => {
            s.push(`export { ${modelName} } from "./src/models/${modelName}";`);
        });
        const resolves = [];
        this.api.eachResolve((method, operationId) => {
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
  ],
  providers: [
    ${this.api.apiName}, ${resolves.join(",")}
  ],
  exports: [
  ]
})
export class ${this.api.angularClientModuleName} {}
`);
        return s.join("\n");
    }
    resolve(method) {
        const responseType = method.getSuccessResponse();
        if (responseType.type.type == "void") {
            throw new Error("cannot create a resolve of a void method");
        }
        // TODO validate parameters - map
        // api call parameters
        const apiParameters = [];
        function addParam(param) {
            let p = method.resolve.parameters[param.name];
            if (Array.isArray(p)) {
                apiParameters.push(p.map((singleParam) => {
                    return `this.getParameterOrData(route, ${JSON.stringify(singleParam)})`;
                }).join(" || "));
            }
            else {
                apiParameters.push(`this.getParameterOrData(route, ${JSON.stringify(p)})`);
            }
        }
        method.eachPathParam(addParam);
        method.eachHeaderParam(addParam, true);
        method.eachQueryParam(addParam);
        if (method.hasBody()) {
            apiParameters.push(`this.getParameterOrData(route, "body")`);
        }
        return `${header}
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { ActivatedRouteSnapshot, Resolve } from "@angular/router";
import { Observable, Subject } from "rxjs/Rx";
import { ${this.api.apiName} } from "../${this.api.apiName}";
import { ${responseType.type.toTypeScriptType()} } from "../models/${responseType.type.toTypeScriptType()}";

@Injectable()
export class ${method.resolve.name} implements Resolve<${responseType.type.toTypeScriptType()}> {

  constructor(
    private api: ${this.api.apiName},
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

  /**
  * get parameter from param first until root, then try on data
  */
  getParameterOrData(snapshot: ActivatedRouteSnapshot, key: string): any {
    let s = snapshot;
    do {
      const d = s.params as any;
      if (d && d[key] !== undefined) {
        return d[key];
      }

      s = s.parent;
    } while (s);

    s = snapshot;
    do {
      const d = s.data as any;
      if (d && d[key] !== undefined) {
        return d[key];
      }

      s = s.parent;
    } while (s);

    return null;
  }
}
`;
    }
    index(filename) {
        const ts = new TypescriptFile_1.TypescriptFile();
        ts.header = header;
        ts.push(`import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Subject, Observable } from "rxjs";`);
        ts.addAbsoluteImport("RequestOptions", path.join(this.api.destinationPath, "src/RequestOptions.ts"));
        // import all models
        this.api.eachModel((model, modelName) => {
            ts.addAbsoluteImport(model.name, model.filename);
        });
        // Api class
        ts.push(`

// this fixes Angular async pipe usage
// rxjs throw an error if no error handler is found in every subscription
// https://github.com/ReactiveX/rxjs/issues/2145 2180
// fixed in RXJS 6 (untested ^.^)

Subject.prototype.error = function (err) {
    if (this.closed) {
        throw new Error("Subject closed");
    }
    this.hasError = true;
    this.thrownError = err;
    this.isStopped = true;
    var observers = this.observers;
    var len = observers.length;
    var copy = observers.slice();
    for (var i = 0; i < len; i++) {
      try {
        copy[i].error(err);
      } catch(e) {}
    }
    this.observers.length = 0;
};

// Angular 5 doesn't support object via get
// but we must do
// credits/license: https://github.com/knowledgecode/jquery-param
function qsStringify(a) {
  var s = [];
  var rbracket = /\[\]$/;
  var add = function (k, v) {
    // ignore functions, because are part of TypeScript classes :S
    if (typeof v !== 'function') {
      v = typeof v === 'function' ? v() : v;
      v = v === null ? '' : v === undefined ? '' : v;
      s[s.length] = encodeURIComponent(k) + '=' + encodeURIComponent(v);
    }
  }

  var buildParams = function (prefix, obj) {
      var i, len, key;

      if (prefix) {
          if (Array.isArray(obj)) {
              for (i = 0, len = obj.length; i < len; i++) {
                  if (rbracket.test(prefix)) {
                      add(prefix, obj[i]);
                  } else {
                      buildParams(
                          prefix + '[' + (typeof obj[i] === 'object' && obj[i] ? i : '') + ']',
                          obj[i]
                      );
                  }
              }
          } else if (String(obj) === '[object Object]') {
              for (key in obj) {
                  buildParams(prefix + '[' + key + ']', obj[key]);
              }
          } else {
              add(prefix, obj);
          }
      } else if (Array.isArray(obj)) {
          for (i = 0, len = obj.length; i < len; i++) {
              add(obj[i].name, obj[i].value);
          }
      } else {
          for (key in obj) {
              buildParams(key, obj[key]);
          }
      }
      return s;
  };

  return buildParams('', a).join('&');
};


@Injectable()
export class ${this.api.apiName} {
  debug: boolean = false;
  host: string = ${JSON.stringify(this.api.servers[0].url)};
  onError: Subject<Error> = new Subject<Error>();

  constructor(
    public http: HttpClient,
  ) {}


  setDebug(d: boolean) {
    this.debug = d;
  }

  setHost(host) {
    this.host = host;
  }

  getFullURL(uri: string) : string {
    return this.host + \`/\${uri}\`.replace(${"/\\/\\//g"}, "/");

  }

`);
        this.api.eachMethod((method) => {
            // CONSTANTS
            ts.push(`// source: ${path.basename(method.api.filename)}`);
            ts.push(`${method.operationId}Verb: string  = ${JSON.stringify(method.verb.toUpperCase())};`);
            ts.push(`${method.operationId}URI: string  = ${JSON.stringify(path.posix.join(method.api.frontBasePath, method.url))};`);
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
                queryParamsCheck.push(`${JSON.stringify(p.name)}: ${p.name}`);
            });
            method.eachHeaderParam((p) => {
                headerParams.push(`${p.name}: ${p.type.toTypeScriptType()},`);
            }, true);
            if (method.hasBody()) {
                bodyParams.push(`$body: ${method.body.type.toTypeScriptType()},`);
            }
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
`);
            if (queryParams.length > 0) {
                ts.push(`
        let $params = new HttpParams({
          fromString: qsStringify({
            ${queryParamsCheck.join(",\n")}
          })
        });
`);
            }
            ts.push(`
        const $url = this.getFullURL(this.${method.operationId}URI)
        ${pathParamsReplace.join("\n")};

        return $url + "?" ${queryParams.length > 0 ? `+ $params.toString().replace(/\\+/g, '%2B')` : ``};
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
            ts.push(`let $headers = new HttpHeaders();`);
            ts.push(`$headers = $headers.append("Accept", ${JSON.stringify(method.getAccept())});`);
            // TODO this need to be reviewed, to choose one, our APIs just have one and this works...
            if (method.hasBody()) {
                ts.push(`$headers = $headers.append("Content-Type", ${JSON.stringify(method.body.encoding)});`);
            }
            method.eachHeaderParam((param) => {
                ts.push(`
          if (${param.name} != null) {
            $headers = $headers.append("${param.headerName || param.name}", ${param.name});
          }
        `);
            }, true);
            ts.push(`const $url: string = this.${method.operationId}URL(${pathParamsNames.concat(queryParamsNames).join(",")});`);
            /*
             * Nasty things below...
             * this.http.get() need to be used for "text" response
             * this.http.get<type>() need to be used for "json" response
             *
             * also the responseType literal need to be casted to itself: "text" as "text"
             *
             * Error handling
             * subject.error is used to throw the CommonException.
             * In many Angular versions the error thrown by rxjs is catched by
             * WHO-KNOWS-WHO (I don't) when you have no error handler
             * that why there is a try/catch and console.error to display proper error
             */
            ts.push(`const $options = {`);
            ts.push(`headers: $headers,`);
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
                console.error(method, responseTypeTS);
                throw new Error(`Cannot determine response type
* application/json treated as json
* text/plain, text/html treated as text
* the rest as blob
found: "${method.produces}" at ${method.api.filename}/${method.operationId}`);
            }
            ts.push(`withCredentials: true // enable CORS`);
            ts.push(`}`);
            const httpParams = ["$url"];
            /* undefined as second paramater if no body parameter found! */
            if (["post", "patch", "put"].indexOf(method.verb) !== -1) {
                if (method.hasBody()) {
                    switch (method.body.encoding) {
                        case "multipart/form-data":
                            ts.push(`
              // transform ${method.body.type.toTypeScriptType()} to FormData
              const formData: FormData = new FormData();

              for (let i in $body) {
                if ($body[i] instanceof Blob) {
                  formData.append(i, $body[i], $body[i].name);
                } else {
                  formData.append(i, $body[i]);
                }
              }
`);
                            httpParams.push("formData");
                            break;
                        default:
                            httpParams.push("$body");
                    }
                }
                else {
                    // just send an undefined
                    httpParams.push("undefined");
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
          console.info(\`${method.verb.toUpperCase()}:\${$url}\`, response, $reqOptions);

          ret.next(${responseTypeTS == "void" ? "null" : responseType.getParser("response", ts)});
          ret.complete();
        }, (response: HttpErrorResponse) => {
          console.error(\`${method.verb.toUpperCase()}:\${$url}\`, response, $reqOptions);
          let error;

          switch("" + response.status) {
            `);
            method.eachResponse((response) => {
                // ignore 2xx
                if (response.httpCode < 300)
                    return;
                response.type.getRandom(ts);
                // if it's a JSON cast it
                // the rest, use it RAW
                if (method.producesJSON()) {
                    ts.push(`
            case "${response.httpCode || 200}":
            error = ${response.type.toTypeScriptType()}.parse(response.error);
            break;
          `);
                }
            });
            ts.push(`
            default:
              error = response.error;
          }

              ret.error(error);
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
    packageJSON() {
        return JSON.stringify({
            name: this.api.angularClientNodeModuleName,
            version: this.api.version,
            description: this.api.description,
            author: {
                name: this.api.authorName,
                email: this.api.authorEmail,
                url: this.api.authorURL,
            },
            peerDependencies: {
                "@angular/core": ">=5.2.0",
                typescript: "*",
            },
            main: "./index.ts",
        }, null, 2);
    }
}
exports.Angular5Api = Angular5Api;
//# sourceMappingURL=Angular5Api.js.map