import { Api } from "../Api";
import { Model } from "../Model";
import { Method } from "../Method";
import { Type } from "../Type";
import { Parameter, ParameterType } from "../Parameter";
import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import { Angular5Client } from "./Angular5Client";
import * as CommonGenerator from "./CommonGenerator";
import { ModificableTemplate } from "./CommonGenerator";
import { TypescriptFile } from "../TypescriptFile";

function mkdirSafe(folder) {
  try {
    fs.mkdirSync(folder);
  } catch (e) {
    if (e.code != "EEXIST") throw e;
  }
}

export class Express {
  constructor(
    public dstPath: string,
    public api: Api
  ) {
  }

  generate(pretty: boolean, lint: boolean) {
    this.api.sort();

    // create generation paths
    mkdirSafe(path.join(this.dstPath));
    mkdirSafe(path.join(this.dstPath, "src"));
    mkdirSafe(path.join(this.dstPath, "src/models"));
    mkdirSafe(path.join(this.dstPath, "src/routes"));
    mkdirSafe(path.join(this.dstPath, "test"));

    // generate all models
    CommonGenerator.models(this.api, this.dstPath);

    // copy raw files (those that don't need to be generated)
    CommonGenerator.copyCommonTemplates(this.dstPath);
    fs.copyFileSync(path.join(process.cwd(), "templates", "node-express", ".gitignore"), path.join(this.dstPath, ".gitignore"));
    fs.copyFileSync(path.join(process.cwd(), "templates", "node-express", "nodemon.json"), path.join(this.dstPath, "nodemon.json"));
    fs.copyFileSync(path.join(process.cwd(), "templates", "node-express", "package.json"), path.join(this.dstPath, "package.json"));
    fs.copyFileSync(path.join(process.cwd(), "templates", "node-express", "tsconfig.json"), path.join(this.dstPath, "tsconfig.json"));

    fs.writeFileSync(path.join(this.dstPath, "./src/swagger.json.ts"), "export default " + JSON.stringify(this.api.originalSource, null, 2));

    this.routesFile("/src/routes.ts");
    this.api.eachMethod((method, name) => {
      this.routeFile(method, `/src/routes/${method.operationId}.ts`);
      this.routeTestFile(method, `/test/${method.operationId}.test.ts`);
    });


    this.indexFile("./src/index.ts");

    if (pretty) {
      CommonGenerator.pretty(this.dstPath);
    }
    // this may take a long time...
    if (lint) {
      CommonGenerator.lint(this.dstPath);
    }
  }

  templates(dstPath: string) {
    ["Cast.ts", "CommonException.ts", "Random.ts"].forEach((filename) => {
      fs.copyFileSync(path.join(process.cwd(), "templates", "node-express", filename), path.join(this.dstPath, filename));
    })
  }

  indexFile(filename: string) {
    CommonGenerator.writeZonedTemplate(path.join(this.dstPath, filename), this.index());
  }

  routesFile(filename: string) {
    CommonGenerator.writeZonedTemplate(path.join(this.dstPath, `.${filename}`), this.routes(filename));
  }

  routeFile(method: Method, filename: string) {
    CommonGenerator.writeZonedTemplate(path.join(this.dstPath, `.${filename}`), this.route(method, filename));
  }

  routeTestFile(method: Method, filename: string) {
    if (fs.existsSync(path.join(this.dstPath, `.${filename}`))) {
      console.log(`file exist: ${filename}, skip creation`);
    } else {
      fs.writeFileSync(path.join(this.dstPath, `.${filename}`), this.routeTest(method, filename));
    }
  }



  routes(filename: string): ModificableTemplate {
    const ts = new TypescriptFile();
    ts.header = "// EDIT ONLY BETWEEN SAFE ZONES //<xxx> //</xxx>";

    ts.rawImports = `import * as express from "express";
import swaggerDocument from "./swagger.json";
const swaggerUi = require('swagger-ui-express');`;

  const s = [];
    this.api.eachMethod((method, operationId) => {
      ts.addImport(`${method.operationId}Route`, method.filename);

      s.push(`r.${method.verb.toLowerCase()}(${JSON.stringify(method.url.replace(/{/g, ":").replace(/}/g, ""))}, ${method.operationId}Route);`);
    });

    ts.body = [`
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
`];

    return {
      tokens: ["swagger-ui-options"],
      template: ts.toString(filename)
    };
  }

  route(method: Method, filename: string): ModificableTemplate {
    const ts = new TypescriptFile();
    ts.header = `// EDIT ONLY SAFE ZONES`;
    ts.rawImports = `import * as express from "express";
import { Request, Response, Upload } from "../";
//<custom-imports>
//</custom-imports>`

    let firstFile = true;
    const getParams = ["req", "res", "next"];
    const params = [];
    const middleware = [];
    method.eachParam((p) => {
      //??p.type.getName()

      params.push(`${p.name}: ${p.type.toTypeScriptType()}`);

      switch(p.in) {
      case ParameterType.BODY:
        getParams.push(p.type.getParser(`req.body.${p.name}`, ts));
        break;
      case ParameterType.COOKIE:
        getParams.push(p.type.getParser(`req.cookies.${p.name} || null`, ts));
        break;
      case ParameterType.HEADER:
        getParams.push(p.type.getParser(`req.get(${JSON.stringify(p.name)})`, ts));
        break;
      case ParameterType.PATH:
        getParams.push(p.type.getParser(`req.params.${p.name}`, ts));
        break;
      case ParameterType.QUERY:
        getParams.push(p.type.getParser(`req.query.${p.name} || null`, ts));
        break;
      case ParameterType.FORM_DATA_FILE:
        getParams.push(`req.files.${p.name} || null`);

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
      }
    });

    const responses = [];
    method.eachResponse((response) => {
      response.type.getRandom(ts);

      // TODO handle file response
      if (method.producesJSON()) {
        responses.push(`function respond${response.httpCode || 200}(res: Response, result: ${response.type.toTypeScriptType()}) {
          res.status(${response.httpCode || 200}).json(result);
        }`);
      } else {
        responses.push(`function respond${response.httpCode || 200}(res: Response, result: ${response.type.toTypeScriptType()}) {
          res.status(${response.httpCode || 200}).send(result);
        }`);
      }
    });

    const successResponse = method.getSuccessResponse();
    const defaultMethodBody = `respond${successResponse.httpCode || 200}(res, ${successResponse.type.getRandom(ts)});`;

    middleware.push(`
function (req: Request, res: Response, next: express.NextFunction) {
  ${method.operationId}(${getParams.join(", ")});
}
`);

    ts.push(`
export const ${method.operationId}Route = [
  ${middleware.join(",\n")}
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
      tokens: ["custom-imports", "method-body", "extras"],
      template: ts.toString(filename)
    };
  }

  routeTest(method: Method, filename: string): string {

    const ts = new TypescriptFile();
    ts.header = `process.env.NODE_ENV = "test";`;

    ts.rawImports =
`import test from "ava";
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


  index(): ModificableTemplate {
return {
  tokens: ["express-configuration", "request", "response"],
  template: `import * as express from "express";
import * as path from "path";
import * as bodyParser from "body-parser";
import { CommonException } from "./CommonException";
import { NotFound } from "./Errors";

const cors = require("cors");
const morgan = require("morgan");

import { routes } from "./routes";

// nodemon kill
process.on("SIGUSR2", () => {
  process.exit(0);
});

export const app = express();
//<express-configuration>
app.set("mongodb", process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test");

// false to disable
app.set("cors", {
  origin: "http://localhost:3003",
  credentials: true,
})
//</express-configuration>

// this is for mongoose generator usage, do not modify
//<mongoose>
//</mongoose>

// declare our own interface for request to save our variables
export class Upload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: string;
  destination: string;
  filename: string;
  path: string;
  buffer: string;
}

export interface Request extends express.Request {
  file: Upload;
  files: { [s: string]: Upload };
  //<request>
  //</request>
}

export interface Response extends express.Response {
  //<response>
  //</response>
}

app.use(morgan("tiny"));
if (app.get("cors")) {
  app.use(
    cors(app.get("cors")),
  );
}

// use query json body parser
app.use(bodyParser.json());
// use query string parser
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

routes(app);

app.use((req: Request, res: express.Response, next: express.NextFunction) => {
  res.status(404).json(new CommonException(404, "not-found", "Not found", null, null, Date.now()));
});

app.use((err: Error, req: Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error handler: ", err);

  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof NotFound) {
    res.status(404).json(new CommonException(404, "not-found", "Not found", null, null, Date.now()));
  }

  if (!(err instanceof CommonException)) {
    console.warn("Unhandled error thrown", err);
    res.status(500).json(new CommonException(500, "internal-error", "Internal server error", null, null, Date.now()));
  }

  res.status(404).json(err);
});

if (process.env.NODE_ENV !== "test") {
  const port: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  console.log("listening at: 0.0.0.0:" + port);
  app.listen(port, "0.0.0.0");
}
`
    };
  }
}
