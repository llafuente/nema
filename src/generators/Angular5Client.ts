import { Api } from "../Api";
import { Method } from "../Method";
import { Parameter, ParameterType } from "../Parameter";
import * as fs from "fs";
import * as path from "path";
import * as CommonGenerator from "./CommonGenerator";
import { TypescriptFile } from "../TypescriptFile";

const mkdirp = require("mkdirp").sync;

const header = "// DO NOT EDIT THIS FILE\n";

export class Angular5Client {
  constructor(public dstPath: string, public api: Api) {}

  generate(pretty: boolean, lint: boolean) {
    this.api.sort();

    // create generation paths
    mkdirp(path.join(this.dstPath, "src/models"));
    mkdirp(path.join(this.dstPath, "src/resolve"));

    // copy raw files (those that don't need to be generated)
    CommonGenerator.copyCommonTemplates(this.dstPath);
    fs.copyFileSync(
      path.join(process.cwd(), "templates", "angular5client", "tsconfig.json"),
      path.join(this.dstPath, "tsconfig.json"),
    );
    fs.copyFileSync(
      path.join(process.cwd(), "templates", "angular5client", "IsError.pipe.ts"),
      path.join(this.dstPath, "src", "IsError.pipe.ts"),
    );
    fs.copyFileSync(
      path.join(process.cwd(), "templates", "angular5client", "IsSuccess.pipe.ts"),
      path.join(this.dstPath, "src", "IsSuccess.pipe.ts"),
    );
    fs.copyFileSync(
      path.join(process.cwd(), "templates", "angular5client", "IsLoading.pipe.ts"),
      path.join(this.dstPath, "src", "IsLoading.pipe.ts"),
    );
    fs.copyFileSync(
      path.join(process.cwd(), "templates", "angular5client", "RequestOptions.ts"),
      path.join(this.dstPath, "src", "RequestOptions.ts"),
    );

    // generate all resolves
    this.api.eachResolve((method, modelName) => {
      this.resolveFile(method, `/src/resolve/${method.resolve.name}.ts`);
    });

    this.indexFile(`/src/${this.api.apiName}.ts`);

    this.moduleFile(`/index.ts`);

    this.packageJSONFile(`/package.json`);

    if (pretty) {
      CommonGenerator.pretty(this.dstPath);
    }
    // this may take a long time...
    if (lint) {
      CommonGenerator.lint(this.dstPath);
    }
  }

  resolveFile(method: Method, filename: string) {
    fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.resolve(method));
  }

  moduleFile(filename: string) {
    fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.module());
  }

  indexFile(filename: string) {
    fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.index(filename));
  }

  packageJSONFile(filename: string) {
    fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.packageJSON());
  }

  module(): string {
    const s = [
      header,
      `import { NgModule, InjectionToken } from "@angular/core";
import { HttpClientModule, HTTP_INTERCEPTORS, HttpInterceptor } from "@angular/common/http";
export { CommonException } from "./src/CommonException";
import { IsErrorPipe } from "./src/IsError.pipe";
import { IsSuccessPipe } from "./src/IsSuccess.pipe";
import { IsLoadingPipe } from "./src/IsLoading.pipe";
import { ${this.api.apiName} } from "./src/${this.api.apiName}";
export { ${this.api.apiName} } from "./src/${this.api.apiName}";
`,
    ];

    this.api.eachModel((model, modelName) => {
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
    IsErrorPipe,
    IsSuccessPipe,
    IsLoadingPipe,
  ],
  providers: [
    ${this.api.apiName}, ${resolves.join(",")}
  ],
  exports: [
    IsErrorPipe,
    IsSuccessPipe,
    IsLoadingPipe,
  ]
})
export class ${this.api.angularClientModuleName} {}
`);

    return s.join("\n");
  }

  resolve(method: Method): string {
    const responseType = method.getSuccessResponse();

    if (responseType.type.type == "void") {
      throw new Error("cannot create a resolve of a void method");
    }

    // TODO validate parameters - map
    // api call parameters
    const apiParameters = [];
    function addParam(param: Parameter) {
      apiParameters.push(`this.getParameter(route, ${JSON.stringify(method.resolve.parameters[param.name])})`);
    }
    method.eachPathParam(addParam);
    method.eachHeaderParam(addParam, true);
    method.eachQueryParam(addParam);
    method.eachBodyParam(addParam);

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

  index(filename): string {
    const ts = new TypescriptFile();
    ts.header = header;

    ts.push(`import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Subject, Observable } from "rxjs";`);

    ts.addImport("CommonException", "/src/CommonException.ts");
    ts.addImport("RequestOptions", "/src/RequestOptions.ts");

    // import all models
    this.api.eachModel((model, modelName) => {
      ts.addImport(model.name, model.filename);
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


@Injectable()
export class ${this.api.apiName} {
  scheme: string = ${JSON.stringify(this.api.schemes[0])};
  debug: boolean = false;
  host: string = ${JSON.stringify(this.api.host)};
  onError: Subject<CommonException> = new Subject<CommonException>();

  constructor(
    public http: HttpClient,
  ) {}

  validSchemes: string[] = ${JSON.stringify(this.api.schemes)};


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
    return \`\${this.scheme}://\` + \`\${this.host}/\${uri}\`.replace(${"/\\/\\//g"}, "/");
  }

`,
    );

    this.api.eachMethod((method) => {
      // CONSTANTS
      ts.push(`// source: ${path.basename(method.api.filename)}`);
      ts.push(`${method.operationId}Verb: string  = ${JSON.stringify(method.verb.toUpperCase())};`);
      ts.push(
        `${method.operationId}URI: string  = ${JSON.stringify(
          path.posix.join(method.api.frontBasePath || method.api.basePath, method.url),
        )};`,
      );

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

      const hasHeaders = method.consumes.length || method.countParams(ParameterType.HEADER, true);

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

      ts.push(
        `const $url: string = this.${method.operationId}URL(${pathParamsNames.concat(queryParamsNames).join(",")});`,
      );

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
      if (hasHeaders) {
        ts.push(`headers: $headers,`);
      }
      if (method.producesJSON()) {
        ts.push(`responseType: "json" as "json",`);
      } else if (method.producesText()) {
        ts.push(`responseType: "text" as "text",`);
      } else if (method.producesBlob()) {
        ts.push(`responseType: "blob" as "blob",`);
      } else if (responseTypeTS != "void") {
        console.error(method, responseTypeTS);
        throw new Error(
          `invalid produces, only: application/json, text/plain, text/html found: "${method.produces}" at ${
            method.api.filename
          }/${method.operationId}`,
        );
      }

      ts.push(`withCredentials: true // enable CORS
      }`);

      const httpParams = ["$url"];
      /* undefined as second paramater if no body parameter found! */
      if (method.requireBody()) {
        if (method.countParams(ParameterType.BODY, true) == 0) {
          httpParams.push("undefined");
        } else {
          // TODO REVIEW This should be just one!!!
          method.eachBodyParam((p) => {
            httpParams.push(p.name);
          });
        }
      }
      httpParams.push("$options");

      if (method.producesJSON()) {
        ts.push(
          `const observable = this.http.${method.verb}<${responseType.toTypeScriptType()}>(${httpParams.join(",")});`,
        );
      } else {
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
          response.error.status = response.error.status || response.status;
          const error = CommonException.parse(response.error);

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
    return JSON.stringify(
      {
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
      },
      null,
      2,
    );
  }
}
