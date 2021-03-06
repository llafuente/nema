import { Api } from "../Api";
import { Method } from "../Method";
import { ParameterType } from "../Parameter";
import * as fs from "fs";
import * as path from "path";
import * as CommonGenerator from "./CommonGenerator";
import { ModificableTemplate } from "./CommonGenerator";
import { TypescriptFile } from "../TypescriptFile";

const mkdirp = require("mkdirp").sync;

export class ExpressApp {
  constructor(public dstPath: string, public api: Api) {}

  generate(pretty: boolean, lint: boolean) {
    this.api.sort();

    // create generation paths
    mkdirp(path.join(this.dstPath, "src"));
    mkdirp(path.join(this.dstPath, "test"));

    fs.copyFileSync(
      path.join(this.api.root, "templates", "node-express", ".gitignore"),
      path.join(this.dstPath, ".gitignore"),
    );
    fs.copyFileSync(
      path.join(this.api.root, "templates", "node-express", "nodemon.json"),
      path.join(this.dstPath, "nodemon.json"),
    );
    fs.copyFileSync(
      path.join(this.api.root, "templates", "node-express", "package.json"),
      path.join(this.dstPath, "package.json"),
    );
    fs.copyFileSync(
      path.join(this.api.root, "templates", "node-express", "tsconfig.json"),
      path.join(this.dstPath, "tsconfig.json"),
    );

    fs.copyFileSync(
      path.join(this.api.root, "templates", "HttpErrors.ts"),
      path.join(this.dstPath, "./src/HttpErrors.ts"),
    );

    if (!fs.existsSync(path.join(this.dstPath, "test", "all.test.ts"))) {
      fs.copyFileSync(
        path.join(this.api.root, "templates", "node-express", "all.test.ts"),
        path.join(this.dstPath, "test", "all.test.ts"),
      );
    } else {
      console.error("skip /test/all.test.ts");
    }

    this.routesFile("/src/routes.ts");
    this.indexFile("./src/index.ts");

    if (pretty) {
      CommonGenerator.pretty(this.api, this.dstPath);
    }
    // this may take a long time...
    if (lint) {
      CommonGenerator.lint(this.api, this.dstPath);
    }
  }

  indexFile(filename: string) {
    CommonGenerator.writeZonedTemplate(path.join(this.dstPath, filename), this.index());
  }

  routesFile(filename: string) {
    CommonGenerator.writeZonedTemplate(path.join(this.dstPath, `.${filename}`), this.routes(filename));
  }

  routes(filename: string): ModificableTemplate {
    const ts = new TypescriptFile();
    ts.header = "// EDIT ONLY BETWEEN SAFE ZONES //<xxx> //</xxx>";

    ts.rawImports = `import * as express from "express";`;


    ts.body = [`
// import generated routed like this example:
//
// import { routes as yourApiRoutes} from "src/users/routes"
// yourApiRoutes(app)
//

//<import-routes>
//</import-routes>
export function routes(app: express.Application) {
  //<routes>
  //</routes>
}
`,
    ];

    return {
      tokens: ["import-routes", "routes"],
      template: ts.toString(filename),
    };
  }

  index(): ModificableTemplate {
    return {
      // mongoose-initialization is not exported
      // will be empty or override by mongoose generator
      tokens: ["custom-imports", "express-configuration", "request", "response"],
      template: `import * as express from "express";
import * as path from "path";
import * as bodyParser from "body-parser";
import { NotFound, Unauthorized } from "./HttpErrors";

// Remember to import at least your routes ^.^
//<custom-imports>
//</custom-imports>

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

// this is for mongoose generator usage, do not modify will be overriden
// once --mongoose-bootstrap is called
//<mongoose-initialization>
//</mongoose-initialization>

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
  res.status(404).json({
    status: 404,
    code: "not-found",
    message: "Route not found"
  });
});

app.use((err: Error, req: Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error handler: ", err);

  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof NotFound) {
    return res.status(404).json({
      status: 404,
      code: "not-found",
      message: err.message || "Not found"
    });
  }

  if (err instanceof Unauthorized) {
    return res.status(401).json({
      status: 401,
      code: "unauthorized",
      message: err.message || "Unauthorized"
    });
  }


//<mongoose-error-handling>
//</mongoose-error-handling>

  return res.status(((err || {}) as any).status || 500).json(err);
});

if (process.env.NODE_ENV !== "test") {
  const port: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  console.log("listening at: 0.0.0.0:" + port);
  app.listen(port, "0.0.0.0");
}
`,
    };
  }
}
