"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const CommonGenerator = require("./CommonGenerator");
const TypescriptFile_1 = require("../TypescriptFile");
const mkdirp = require("mkdirp").sync;
class ExpressApp {
    constructor(config) {
        this.config = config;
        // create generation paths
        mkdirp(path.join(this.config.dstPath, "src"));
        mkdirp(path.join(this.config.dstPath, "test"));
        fs.copyFileSync(path.join(this.config.api.root, "templates", "node-express", ".gitignore"), path.join(this.config.dstPath, ".gitignore"));
        fs.copyFileSync(path.join(this.config.api.root, "templates", "node-express", "nodemon.json"), path.join(this.config.dstPath, "nodemon.json"));
        fs.copyFileSync(path.join(this.config.api.root, "templates", "node-express", "package.json"), path.join(this.config.dstPath, "package.json"));
        fs.copyFileSync(path.join(this.config.api.root, "templates", "node-express", "tsconfig.json"), path.join(this.config.dstPath, "tsconfig.json"));
        fs.copyFileSync(path.join(this.config.api.root, "templates", "HttpErrors.ts"), path.join(this.config.dstPath, "./src/HttpErrors.ts"));
        if (!fs.existsSync(path.join(this.config.dstPath, "test", "all.test.ts"))) {
            fs.copyFileSync(path.join(this.config.api.root, "templates", "node-express", "all.test.ts"), path.join(this.config.dstPath, "test", "all.test.ts"));
        }
        else {
            console.error("skip /test/all.test.ts");
        }
        this.routesFile("/src/routes.ts");
        this.indexFile("./src/index.ts");
        if (config.pretty) {
            CommonGenerator.pretty(this.config.api, this.config.dstPath);
        }
        // this may take a long time...
        if (config.lint) {
            CommonGenerator.lint(this.config.api, this.config.dstPath);
        }
    }
    indexFile(filename) {
        CommonGenerator.writeZonedTemplate(path.join(this.config.dstPath, filename), this.index());
    }
    routesFile(filename) {
        CommonGenerator.writeZonedTemplate(path.join(this.config.dstPath, `.${filename}`), this.routes(filename));
    }
    routes(filename) {
        const ts = new TypescriptFile_1.TypescriptFile();
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
    index() {
        return {
            tokens: ["mongoose-initialization", "custom-imports", "express-configuration", "request", "response"],
            template: `import * as express from "express";
import * as path from "path";
import * as bodyParser from "body-parser";
import { NotFound, Unauthorized, Forbidden, InternalError, BadRequest } from "./HttpErrors";

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

// want to disable CORS? app.set("cors", false);
app.set("cors", {
  // this allow all origins
  origin: function(origin, callback) {
    callback(null, true);
  },
  // this allow cookies
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

// declare a Request extension to store all we need
export interface Request extends express.Request {
  file: Upload;
  files: { [s: string]: Upload };
  //<request>
  //</request>
}

// declare a Response extension to store all we need
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

// route not found
app.use((req: Request, res: express.Response, next: express.NextFunction) => {
  res.status(404).json({
    status: 404,
    code: "not-found",
    message: "Route not found"
  });
});

// error handler
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

  if (err instanceof BadRequest) {
    return res.status(400).json({
      status: 400,
      code: "bad-request",
      message: err.message || "Bad request"
    });
  }

  if (err instanceof Forbidden) {
    return res.status(403).json({
      status: 403,
      code: "forbidden",
      message: err.message || "Forbidden"
    });
  }


  if (err instanceof InternalError) {
    return res.status(500).json({
      status: 500,
      code: "internal-server-error",
      message: err.message || "Internal server error"
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
exports.ExpressApp = ExpressApp;
//# sourceMappingURL=ExpressApp.js.map