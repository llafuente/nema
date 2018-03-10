import { Api, parseYML } from "../Api";
import * as path from "path";
import * as CommonGenerator from "./CommonGenerator";

const mkdirp = require("mkdirp").sync;
const mongooseSwagger = parseYML(path.join(__dirname, "..", "..", "..", "common.yml"));

export class Common {
  constructor(public dstPath: string, public api: Api) {
    this.api.parseSwaggerDefinitions(mongooseSwagger, true);
  }

  generate(pretty: boolean, lint: boolean) {
    this.api.sort();

    // create generation paths
    mkdirp(path.join(this.dstPath, "src/models")); // raw models

    CommonGenerator.models(this.api, this.dstPath);
  }
}
