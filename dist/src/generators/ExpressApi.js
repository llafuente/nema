"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Type_1 = require("../Type");
const Parameter_1 = require("../Parameter");
const fs = require("fs");
const path = require("path");
const CommonGenerator = require("./CommonGenerator");
const TypescriptFile_1 = require("../TypescriptFile");
const utils_1 = require("../utils");
const mkdirp = require("mkdirp").sync;
class ExpressApi {
    constructor(dstPath, api) {
        this.dstPath = dstPath;
        this.api = api;
    }
    static getExpressAppRoot(dstPath) {
        let p = dstPath;
        let parsed;
        // find the relative path to index.ts form express
        do {
            if (fs.existsSync(path.join(p, "package.json"))) {
                return p;
            }
            p = path.resolve(p, "..");
            parsed = path.parse(p);
        } while (parsed.root != parsed.dir);
        throw new Error("package.json cannot be found");
    }
    generate(pretty, lint) {
        this.api.sort();
        this.expressAppRoot = ExpressApi.getExpressAppRoot(this.dstPath);
        console.info(`Located package.json at: ${this.expressAppRoot}`);
        // create generation paths
        mkdirp(path.join(this.dstPath, "src/models"));
        mkdirp(path.join(this.dstPath, "src/routes"));
        mkdirp(path.join(this.dstPath, "test"));
        CommonGenerator.models(this.api, this.dstPath);
        // copy raw files (those that don't need to be generated)
        CommonGenerator.copyCommonTemplates(this.api, this.dstPath);
        fs.writeFileSync(path.join(this.dstPath, "./src/api-definition.json.ts"), "export default " + JSON.stringify(this.api.originalSource, null, 2));
        this.indexFile("/index.ts");
        this.routesFile("/src/routes.ts");
        this.api.eachMethod((method, name) => {
            this.routeFile(method, `src/routes/${method.operationId}.ts`);
            this.routeTestFile(method, `test/${method.operationId}.test.ts`);
        });
        if (this.api.security) {
            CommonGenerator.writeZonedTemplate(path.join(this.expressAppRoot, "src/auth.ts"), this.security());
        }
        if (pretty) {
            CommonGenerator.pretty(this.api, this.dstPath);
        }
        // this may take a long time...
        if (lint) {
            CommonGenerator.lint(this.api, this.dstPath);
        }
    }
    indexFile(filename) {
        const file = path.join(this.dstPath, filename);
        CommonGenerator.writeZonedTemplate(file, this.index(file));
    }
    routesFile(filename) {
        CommonGenerator.writeZonedTemplate(path.join(this.dstPath, filename), this.routes(filename));
    }
    routeFile(method, filename) {
        CommonGenerator.writeZonedTemplate(path.join(this.dstPath, filename), this.route(method, filename));
    }
    routeTestFile(method, filename) {
        const file = path.join(this.dstPath, filename);
        if (fs.existsSync(file)) {
            console.info(`file exist: ${file}, skip creation`);
        }
        else {
            fs.writeFileSync(file, this.routeTest(method, filename));
        }
    }
    routes(filename) {
        const ts = new TypescriptFile_1.TypescriptFile();
        ts.header = "// EDIT ONLY BETWEEN SAFE ZONES //<xxx> //</xxx>";
        ts.rawImports = `import * as express from "express";
import swaggerDocument from "./api-definition.json";
const swaggerUi = require('swagger-ui-express');`;
        const s = [];
        this.api.eachMethod((method, operationId) => {
            ts.addAbsoluteImport(`${method.operationId}Route`, method.filename);
            s.push(`r.${method.verb.toLowerCase()}(${JSON.stringify(method.url.replace(/{/g, ":").replace(/}/g, ""))}, ${method.operationId}Route(app));`);
        });
        ts.body = [
            `
export function routes(app: express.Application) {
  const r: express.Router = express.Router();
  app.use(${JSON.stringify(this.api.backBasePath)}, r);

  // remove the content it if don't want to display your API
  //<swagger-ui-options>
  var options = {
  };

  app.use('/api-ui', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
  //</swagger-ui-options>


  ${s.join("\n")}
}
`,
        ];
        return {
            tokens: ["swagger-ui-options"],
            template: ts.toString(path.join(this.api.destinationPath, filename)),
        };
    }
    route(method, filename) {
        // NOTE cannot resolve as linux directly
        const targetDir = path.join(this.dstPath, path.dirname(filename));
        const relPath = path.relative(targetDir, path.join(this.expressAppRoot, "src")).replace(/\\/g, "/");
        const ts = new TypescriptFile_1.TypescriptFile();
        ts.header = `// EDIT ONLY SAFE ZONES`;
        ts.rawImports = `import * as express from "express";
import { Request, Response, Upload } from "${relPath}/";
//<custom-imports>
//</custom-imports>`;
        let firstFile = true;
        const getParams = ["req", "res", "next"];
        const implParams = [
            "req: Request",
            "res: Response",
            "next: express.NextFunction",
        ];
        const paramValidations = [];
        const middleware = [];
        method.eachParam((p) => {
            //??p.type.getName()
            implParams.push(`${p.name}: ${p.type.toTypeScriptType()}`);
            // TODO what type of Error should the API return ?! ApiError? CommonException?
            let src = null;
            switch (p.in) {
                case Parameter_1.ParameterType.BODY:
                    src = `req.body`;
                    break;
                case Parameter_1.ParameterType.COOKIE:
                    src = `req.cookies.${p.name}`;
                    break;
                case Parameter_1.ParameterType.HEADER:
                    src = `req.get(${JSON.stringify(p.name)})`;
                    break;
                case Parameter_1.ParameterType.PATH:
                    src = `req.params.${p.name}`;
                    break;
                case Parameter_1.ParameterType.QUERY:
                    src = `req.query.${p.name}`;
                    break;
                default:
                    throw new Error("unexpeted parameter type");
            }
            if (src != null) {
                getParams.push(`${src} == null ? null : ${p.type.getParser(`${src}`, ts)}`);
                if (p.required) {
                    ts.addAbsoluteImport("BadRequest", path.join(this.expressAppRoot, "src/HttpErrors.ts"));
                    paramValidations.push(`if (!${src}) {
            return next(new BadRequest("${p.name} required in ${p.in}"))
          }`);
                }
            }
        });
        if (method.hasBody()) {
            switch (method.body.encoding) {
                case "multipart/form-data":
                    ts.addImport("* as _", "lodash");
                    ts.push(`
let multer = require("multer");
let upload = multer({
  // dest: 'uploads/' }
  storage: multer.memoryStorage(),
});
`);
                    // upload.any() is the easy way, because it works like body/query
                    // REVIEW it's the best?!
                    middleware.push(`upload.any()`);
                    const type = method.body.type.derefence();
                    if (type.type != Type_1.Kind.OBJECT) {
                        throw new utils_1.Limitation("multipart/form-data type must be an object");
                    }
                    for (let propertyName in type.properties) {
                        const subt = type.properties[propertyName];
                        if (subt.type == Type_1.Kind.FILE) {
                            getParams.push(`_.find(req.files, { fieldname: '${propertyName}'}) || null`);
                            implParams.push(`${propertyName}: Upload`);
                        }
                    }
                    // if required
                    //  if (!req.file) {
                    //    return next(new HttpError(422, "Excepted an attachment"));
                    //  }
                    break;
                default:
                    getParams.push(`req.body == null ? null : ${method.body.type.getParser('req.body', ts)}`);
                    implParams.push(`$body: ${method.body.type.toTypeScriptType()}`);
            }
            if (method.body.required) {
                ts.addAbsoluteImport("BadRequest", path.join(this.expressAppRoot, "src/HttpErrors.ts"));
                paramValidations.push(`if (!req.body) {
          return next(new BadRequest("body of type: ${method.body.type.toTypeScriptType()} is required"));
        }`);
            }
        }
        const responses = [];
        method.eachResponse((response) => {
            response.type.getRandom(ts);
            // TODO handle file response
            if (method.producesJSON()) {
                responses.push(`function respond${response.httpCode ||
                    200}(res: Response, result: ${response.type.toTypeScriptType()}) {
          res.status(${response.httpCode || 200}).json(result);
        }`);
            }
            else {
                responses.push(`function respond${response.httpCode ||
                    200}(res: Response, result: ${response.type.toTypeScriptType()}) {
          res.status(${response.httpCode || 200}).send(result);
        }`);
            }
        });
        const successResponse = method.getSuccessResponse();
        const defaultMethodBody = `respond${successResponse.httpCode || 200}(res, ${successResponse.type.getRandom(ts)});`;
        middleware.push(`
function (req: Request, res: Response, next: express.NextFunction) {
  ${paramValidations.join(";\n")}
  ${method.operationId}(${getParams.join(", ")});
}
`);
        if (method.secuity) {
            ts.addAbsoluteImport("auth", path.join(this.expressAppRoot, "src/auth.ts"));
        }
        ts.push(`
export function ${method.operationId}Route(app: express.Application): express.RequestHandler[] {
  return [
    ${method.secuity ? "auth(app)," : ""}
    //<pre-middleware>
    //</pre-middleware>
    ${middleware.join(",\n")}
    //<post-middleware>
    //</post-middleware>
  ] as any[];
}

export async function ${method.operationId}(${implParams.join(", ")}) {
  try {
//<method-body>
${defaultMethodBody}
//</method-body>
} catch(e) {
  next(e);
}
}
${responses.join("\n\n")}
//<extras>
//</extras>
`);
        return {
            tokens: ["custom-imports", "method-body", "extras", "pre-middleware", "post-middleware"],
            template: ts.toString(path.join(this.api.destinationPath, filename)),
        };
    }
    routeTest(method, filename) {
        const ts = new TypescriptFile_1.TypescriptFile();
        ts.header = `process.env.NODE_ENV = "test";`;
        ts.rawImports = `import test from "ava";
import { app } from "../src/";
import * as supertest from "supertest";
import * as qs from "qs";`;
        const query = [];
        method.eachQueryParam((p) => {
            query.push(`${JSON.stringify(p.name)}: ${p.type.getRandom(ts)}`);
        });
        ts.push(`
test.cb.serial("${method.operationId}", (t) => {

  supertest(app)
  .${method.verb}(${JSON.stringify(method.url)} + "?" + qs.stringify({${query.join(",\n")}}))
`);
        method.eachHeaderParam((p) => {
            ts.push(`.set(${JSON.stringify(p.headerName)}, "xxx")`);
        }, false);
        if (method.hasBody()) {
            ts.push(`.send(${method.body.type.getRandom(ts)})`);
        }
        if (method.consumes.length) {
            ts.push(`.set("Content-Type", ${JSON.stringify(method.consumes.join(", "))})`);
        }
        ts.push(`.set("Accept", ${JSON.stringify(method.getAccept())})
.expect(${method.getSuccessResponse().httpCode})
.end(function(err: Error, response) {
  if (err) {
    t.fail(err.message);
  }
    t.pass();
    t.end();
  });
});
`);
        return ts.toString(filename);
    }
    index(filename) {
        const ts = new TypescriptFile_1.TypescriptFile();
        const s = [];
        this.api.eachModel((model, name) => {
            ts.addAbsoluteImport(model.name, model.filename);
            ts.addAbsoluteExport(model.name, model.filename);
        });
        this.api.eachMethod((method, name) => {
            ts.addAbsoluteImport(method.operationId, method.filename);
            ts.addAbsoluteExport(method.operationId, method.filename);
        });
        ts.addAbsoluteExport("routes", path.join(this.api.destinationPath, "src/routes.ts"));
        return {
            // internal-mongoose-initialization is not exported
            // will be empty or override by mongoose generator
            tokens: [""],
            template: ts.toString(filename)
        };
    }
    security() {
        return {
            // internal-mongoose-initialization is not exported
            // will be empty or override by mongoose generator
            tokens: ["custom-imports", "authenticate"],
            template: `import { pbkdf2Sync, randomBytes } from "crypto";
import { Request } from "./index";
import { Unauthorized } from "./HttpErrors";
import * as express from "express";
const expressJwt = require("express-jwt");

//<custom-imports>
//</custom-imports>

export function auth(app: express.Application): express.RequestHandler[] {

  if (!app.get("JWTSecret")) {
    throw new Error('defined JWTSecret using express.set("JWTSecret", ...)')
  }

  // JWT: regenerate session pass
  return [
    expressJwt({
      secret: app.get("JWTSecret"),
      credentialsRequired: false,
      getToken: function fromHeader(req) {
        const header = req.headers[${JSON.stringify(this.api.security.headerName.toLowerCase())}];
        if (header) {
          const x = header.split(" ");
          if (x[0] === "Bearer") {
            return x[1];
          }
        }

        return null;
      }
    }),
    function auth(
      req: Request,
      res: express.Response,
      next: express.NextFunction
    ) {
      const r: any = req;

      // bypass typesystem a moment ^.^
      if (!r.user || !r.user._id) {
        return next(new Unauthorized());
      }

      // here you may go to database to get the lastest user object.
      // or just continue using the one you sent to user :)

      //<authenticate>

      // It's recommended to define this type at: interface Request @./index.ts
      // move to user -> loggedUser
      req.loggedUser = r.user;
      delete r.user;

      next();

      //</authenticate>
    }
  ];

}
`
        };
    }
}
exports.ExpressApi = ExpressApi;
//# sourceMappingURL=ExpressApi.js.map