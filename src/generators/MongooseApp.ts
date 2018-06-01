import * as assert from "assert";
import { Api, parseYML } from "../Api";
import { Model } from "../Model";
import { Type, Kind } from "../Type";
import * as fs from "fs";
import * as path from "path";
import * as CommonGenerator from "./CommonGenerator";
import { ModificableTemplate } from "./CommonGenerator";

const mkdirp = require("mkdirp").sync;

export class MongooseApp {
  constructor(public dstPath: string, public api: Api) {
  }

  generate(pretty: boolean, lint: boolean) {
    this.api.sort();

    // create generation paths
    mkdirp(path.join(this.dstPath, "src/"));
    mkdirp(path.join(this.dstPath, "test/"));

    if (!fs.existsSync(path.join(this.dstPath, "test", "mongoose.connection.test.ts"))) {
      fs.copyFileSync(
        path.join(this.api.root, "templates", "mongoose", "mongoose.connection.test.ts"),
        path.join(this.dstPath, "test", "mongoose.connection.test.ts"),
      );
    } else {
      console.error("skip /test/mongoose.connection.test.ts");
    }


    const indexFile = path.join(this.dstPath, "./src/index.ts");
    if (!fs.existsSync(indexFile)) {
      throw new Error(`${indexFile} must exists. Execute --express-bootstrap before this generator`)
    }

    CommonGenerator.setZonedTemplate(
      indexFile,
      "mongoose-initialization",
      `
import initMongoose from "./mongoose";
initMongoose(app);
      `,
    );

    // TODO do it!
    CommonGenerator.setZonedTemplate(
      path.join(this.dstPath, "./src/index.ts"),
      "mongoose-error-handling",
      `
// ????
      `,
    );

    CommonGenerator.copyZonedTemplate(
      path.join(this.api.root, "templates", "mongoose", "mongoose.ts"),
      path.join(this.dstPath, "src", "mongoose.ts"),
      ["import-models"],
    );

    if (pretty) {
      CommonGenerator.pretty(this.api, this.dstPath);
    }

    // this may take a long time...
    if (lint) {
      CommonGenerator.lint(this.api, this.dstPath);
    }
  }
}
