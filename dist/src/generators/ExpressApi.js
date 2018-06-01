"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Parameter_1 = require("../Parameter");
const fs = require("fs");
const path = require("path");
const CommonGenerator = require("./CommonGenerator");
const TypescriptFile_1 = require("../TypescriptFile");
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
        console.log(`Located package.json at: ${this.expressAppRoot}`);
        // create generation paths
        mkdirp(path.join(this.dstPath, "src/models"));
        mkdirp(path.join(this.dstPath, "src/routes"));
        mkdirp(path.join(this.dstPath, "test"));
        CommonGenerator.models(this.api, this.dstPath);
        // copy raw files (those that don't need to be generated)
        CommonGenerator.copyCommonTemplates(this.api, this.dstPath);
        fs.writeFileSync(path.join(this.dstPath, "./src/swagger.json.ts"), "export default " + JSON.stringify(this.api.originalSource, null, 2));
        this.indexFile("/index.ts");
        this.routesFile("/src/routes.ts");
        this.api.eachMethod((method, name) => {
            this.routeFile(method, `/src/routes/${method.operationId}.ts`);
            this.routeTestFile(method, `/test/${method.operationId}.test.ts`);
        });
        if (pretty) {
            CommonGenerator.pretty(this.api, this.dstPath);
        }
        // this may take a long time...
        if (lint) {
            CommonGenerator.lint(this.api, this.dstPath);
        }
    }
    indexFile(filename) {
        CommonGenerator.writeZonedTemplate(path.join(this.dstPath, filename), this.index());
    }
    routesFile(filename) {
        CommonGenerator.writeZonedTemplate(path.join(this.dstPath, `.${filename}`), this.routes(filename));
    }
    routeFile(method, filename) {
        CommonGenerator.writeZonedTemplate(path.join(this.dstPath, `.${filename}`), this.route(method, filename));
    }
    routeTestFile(method, filename) {
        if (fs.existsSync(path.join(this.dstPath, `.${filename}`))) {
            console.log(`file exist: ${filename}, skip creation`);
        }
        else {
            fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.routeTest(method, filename));
        }
    }
    routes(filename) {
        const ts = new TypescriptFile_1.TypescriptFile();
        ts.header = "// EDIT ONLY BETWEEN SAFE ZONES //<xxx> //</xxx>";
        ts.rawImports = `import * as express from "express";
import swaggerDocument from "./swagger.json";
const swaggerUi = require('swagger-ui-express');`;
        const s = [];
        this.api.eachMethod((method, operationId) => {
            ts.addImport(`${method.operationId}Route`, method.filename);
            s.push(`r.${method.verb.toLowerCase()}(${JSON.stringify(method.url.replace(/{/g, ":").replace(/}/g, ""))}, ${method.operationId}Route);`);
        });
        ts.body = [
            `
export function routes(app: express.Application) {
  const r: express.Router = express.Router();
  app.use(${JSON.stringify(this.api.basePath)}, r);

  var options = {
    //<swagger-ui-options>
    //</swagger-ui-options>
  };

  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));


  ${s.join("\n")}
}
`,
        ];
        return {
            tokens: ["swagger-ui-options"],
            template: ts.toString(filename),
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
        const paramValidations = [];
        const params = [];
        const middleware = [];
        method.eachParam((p) => {
            //??p.type.getName()
            params.push(`${p.name}: ${p.type.toTypeScriptType()}`);
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
                case Parameter_1.ParameterType.FORM_DATA_FILE:
                    //getParams.push(`req.files.${p.name} || null`);
                    getParams.push(`_.find(req.files, { fieldname: '${p.name}'}) || null`);
                    ts.addImport("* as _", "lodash");
                    // if required
                    //  if (!req.file) {
                    //    return next(new HttpError(422, "Excepted an attachment"));
                    //  }
                    params.pop(); // remove last because it's a Blob, invalid at server
                    params.push(`${p.name}: Upload`);
                    if (firstFile) {
                        // upload.any() is the easy way, because it works like body/query
                        // REVIEW it's the best?!
                        firstFile = false;
                        ts.push(`
let multer = require("multer");
let upload = multer({
  // dest: 'uploads/' }
  storage: multer.memoryStorage(),
});
`);
                        middleware.push(`upload.any()`);
                    }
                    break;
                default:
                    throw new Error("unexpeted parameter type");
            }
            if (src != null) {
                getParams.push(`${src} == null ? null : ${p.type.getParser(`${src}`, ts)}`);
                if (p.required) {
                    paramValidations.push(`if (!${src}) {
            return res.status(400).json({message: "${p.name} required in ${p.in}"})
          }`);
                }
            }
        });
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
        ts.push(`
export const ${method.operationId}Route = [
  //<pre-middleware>
  //</pre-middleware>
  ${middleware.join(",\n")}
  //<post-middleware>
  //</post-middleware>
];
export function ${method.operationId}(req: Request, res: Response, next: express.NextFunction, ${params.join(", ")}) {
//<method-body>
${defaultMethodBody}
//</method-body>
}
${responses.join("\n\n")}
//<extras>
//</extras>
`);
        return {
            tokens: ["custom-imports", "method-body", "extras", "pre-middleware", "post-middleware"],
            template: ts.toString(filename),
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
  .${method.verb}(${JSON.stringify(path.posix.join(method.api.basePath, method.url))} + "?" + qs.stringify({${query.join(",\n")}}))
`);
        method.eachHeaderParam((p) => {
            ts.push(`.set(${JSON.stringify(p.headerName)}, "xxx")`);
        }, false);
        method.eachBodyParam((p) => {
            ts.push(`.send(${p.type.getRandom(ts)})`);
        });
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
    index() {
        const s = [];
        this.api.eachModel((model, name) => {
            s.push(`
      import { ${name} } from ".${model.filename.substr(0, model.filename.length - 3)}";
      export { ${name} } from ".${model.filename.substr(0, model.filename.length - 3)}";
`);
        });
        this.api.eachMethod((method, name) => {
            s.push(`
      import { ${method.operationId} } from "./src/routes/${method.operationId}";
      export { ${method.operationId} } from "./src/routes/${method.operationId}";
`);
        });
        return {
            // internal-mongoose-initialization is not exported
            // will be empty or override by mongoose generator
            tokens: [""],
            template: `
export { routes } from "./src/routes";

${s.join("\n")}
`,
        };
    }
}
exports.ExpressApi = ExpressApi;
//# sourceMappingURL=ExpressApi.js.map