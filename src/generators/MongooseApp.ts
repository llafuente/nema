import * as assert from "assert";
import { Api } from "../Api";
import { Model } from "../Model";
import { Type, Kind } from "../Type";
import { Config } from "../Config";
import * as fs from "fs";
import * as path from "path";
import * as CommonGenerator from "./CommonGenerator";
import { ModificableTemplate } from "./CommonGenerator";
import { ksort, uniquePush } from "../utils";

const mkdirp = require("mkdirp").sync;

export class MongooseApp {
  constructor(public config: Config) {
    // create generation paths
    mkdirp(path.join(this.config.dstPath, "src/"));
    mkdirp(path.join(this.config.dstPath, "test/"));

    console.info("# add more dependencies to the project");
    const packageJSONFile = path.join(this.config.dstPath, "package.json");
    try {
      const packageJSON = require(packageJSONFile);

      packageJSON.dependencies["bluebird"] = "3.5.1";
      packageJSON.dependencies["mongoose"] = "5.0.10";
      packageJSON.dependencies["mongoosemask"] = "0.0.6";

      packageJSON.devDependencies["@types/bluebird"] = "3.5.20";
      packageJSON.devDependencies["@types/mongoose"] = "5.0.7";

      packageJSON.devDependencies = ksort(packageJSON.devDependencies);
      packageJSON.dependencies = ksort(packageJSON.dependencies);

      try {
        fs.writeFileSync(packageJSONFile, JSON.stringify(packageJSON, null, 2));
      } catch (e) {
        console.log(`cannot write: ${packageJSONFile}`);
      }

    } catch(e) {
      console.log(`cannot read: ${packageJSONFile}`);
    }

    console.info("# modify tsconfig");
    const tsconfigFile = path.join(this.config.dstPath, "tsconfig.json");
    try {
      const tsconfig = require(tsconfigFile);

      uniquePush(tsconfig.compilerOptions.types, "bluebird");
      uniquePush(tsconfig.compilerOptions.types, "mongoose");

      try {
        fs.writeFileSync(tsconfigFile, JSON.stringify(tsconfig, null, 2));
      } catch (e) {
        console.log(`cannot write: ${tsconfigFile}`);
      }

    } catch(e) {
      console.log(`cannot read: ${tsconfigFile}`);
    }

    console.info("# add mongoose.connection.test.ts");
    if (!fs.existsSync(path.join(this.config.dstPath, "test", "mongoose.connection.test.ts"))) {
      fs.copyFileSync(
        path.join(this.config.api.root, "templates", "mongoose", "mongoose.connection.test.ts"),
        path.join(this.config.dstPath, "test", "mongoose.connection.test.ts"),
      );
    } else {
      console.error("# skip /test/mongoose.connection.test.ts");
    }


    console.info("# modify /src/index.ts");
    const indexFile = path.join(this.config.dstPath, "./src/index.ts");
    if (!fs.existsSync(indexFile)) {
      throw new Error(`${indexFile} must exists. Execute --express-app before this generator`)
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
      path.join(this.config.dstPath, "./src/index.ts"),
      "mongoose-error-handling",
      `
// ????
      `,
    );

    console.info("# modify /templates/mongoose/mongoose.ts");
    CommonGenerator.copyZonedTemplate(
      path.join(this.config.api.root, "templates", "mongoose", "mongoose.ts"),
      path.join(this.config.dstPath, "src", "mongoose.ts"),
      ["import-models"],
    );
  }
}
