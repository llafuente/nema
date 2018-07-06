import { Api } from "../Api";
import { Model } from "../Model";
import * as fs from "fs";
import * as path from "path";
import * as CommonGenerator from "./CommonGenerator";
import { TypescriptFile } from "../TypescriptFile";

const mkdirp = require("mkdirp").sync;

export class ExpressCSV {
  constructor(public dstPath: string, public api: Api) {}

  generate(pretty: boolean, lint: boolean) {
    this.api.sort();

    // create generation paths
    mkdirp(path.join(this.dstPath, "src/csv"));


    const packageJSONFile = path.join(this.dstPath, "package.json");
    try {
      const packageJSON = require(packageJSONFile);

      packageJSON.dependencies["xlsx"] = "0.12.5";
      packageJSON.dependencies["csv"] = "2.0.0";
      packageJSON.dependencies["csv-write-stream"] = "2.0.0";

      try {
        fs.writeFileSync(packageJSONFile, JSON.stringify(packageJSON, null, 2));
      } catch (e) {
        console.error(`cannot write: ${packageJSONFile}`);
      }

    } catch(e) {
      console.error(`cannot read: ${packageJSONFile}`);
    }


    this.api.eachModel((mdl, modelName) => {
      const dst = `/src/csv/${mdl.name}.ts`;
      fs.writeFileSync(path.join(this.dstPath, `.${dst}`), this.csv(this.api, mdl, dst));
    });

    if (pretty) {
      CommonGenerator.pretty(this.api, this.dstPath);
    }
    // this may take a long time...
    if (lint) {
      CommonGenerator.lint(this.api, this.dstPath);
    }
  }

  csv(api: Api, model: Model, filename: string) {
    const ts = new TypescriptFile();

    ts.addAbsoluteImport(model.interfaceName, model.filename);

    ts.rawImports = `
import { read, utils } from "xlsx";
import * as path from "path";
`;

    ts.push(`
export function fromFile(filename: string, xml: Buffer): ${model.interfaceName}[] {
  let workbook;
  switch (path.extname(filename)) {
    case ".csv":
      workbook = read(xml.toString(), { type: "binary" });
      break;
    case ".xml":
      workbook = read(xml, { type: "buffer" });
      break;
    default:
      throw new Error("Invalid format: only .csv or .xml (excel 2003 xml)");
  }

  if (workbook.SheetNames.length > 1) {
    throw new Error("Only one sheet page supported");
  }

  //console.log(XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]));

  return utils.sheet_to_json<${model.interfaceName}>(
    workbook.Sheets[workbook.SheetNames[0]]
  ).map(x => ${model.type.getParser("x", ts)});
}

export function toCSV(arr: ${model.name}[]): string {

}

export function toXML(arr: ${model.name}[]): string {

}

`);

    return ts.toString(filename);
  }
}
