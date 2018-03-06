import { Api, parseYML } from "../Api";
import { mkdirSafe } from "./CommonGenerator";
import * as path from "path";
import * as CommonGenerator from "./CommonGenerator";

const mongooseSwagger = parseYML(path.join(__dirname, "..", "..", "..", "common.yml"));

export class Common {
  constructor(public dstPath: string, public api: Api) {
    this.api.parseSwaggerDefinitions(mongooseSwagger, true);
  }

  generate(pretty: boolean, lint: boolean) {
    this.api.sort();

    // create generation paths
    mkdirSafe(path.join(this.dstPath));
    mkdirSafe(path.join(this.dstPath, "src"));
    mkdirSafe(path.join(this.dstPath, "src/models")); // raw models

    CommonGenerator.models(this.api, this.dstPath);
  }
}
