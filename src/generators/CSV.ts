import { Api } from "../Api";
import { Model } from "../Model";
import * as fs from "fs";
import * as path from "path";
import * as CommonGenerator from "./CommonGenerator";
import { TypescriptFile } from "../TypescriptFile";

const mkdirp = require("mkdirp").sync;

export class CSV {
  constructor(public dstPath: string) {}

  generate(api: Api, pretty: boolean, lint: boolean) {
    api.sort();

    // create generation paths
    mkdirp(path.join(this.dstPath, "src/csv"));

    api.eachModel((mdl, modelName) => {
      const dst = `/src/csv/${mdl.name}.ts`;
      fs.writeFileSync(path.join(this.dstPath, `.${dst}`), this.csv(api, mdl, dst));
    });

    if (pretty) {
      CommonGenerator.pretty(this.dstPath);
    }
    // this may take a long time...
    if (lint) {
      CommonGenerator.lint(this.dstPath);
    }
  }

  csv(api: Api, model: Model, filename: string) {
    const ts = new TypescriptFile();
    ts.addImport("CommonException", "/src/CommonException");

    ts.rawImports = `const parse = require("csv-parse/lib/sync");
const XLSX = require("xlsx");
const async = require("async");`;

    ts.push(`
export function fromExcelXML(xml: Buffer) {
  let workbook = XLSX.read(xml, { type: "buffer" });

  const sheets = Object.keys(workbook.Sheets);
  if (workbook.SheetNames.length > 1) {
    throw new CommonException(422, "unprocesable-entity", "Can only import one sheet page", null, null, null);
  }

  //console.log(XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]));

  const dataList = parse(XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]), {
    columns: true,
    comment: "#",
  });

  // console.log(dataList);
  return dataList.map(x => ${model.type.getParser("x", ts)});
}

export function fromCSV(csv_str: string, delimeter = ";", escape = "\\"") {
  const dataList = parse(csv_str.toString(), {
    columns: true,
    comment: "#",
    delimiter: delimeter,
    escape: escape,
  });

  // console.log(dataList);
  return dataList.map(x => ${model.type.getParser("x", ts)});
}

export function toCSV(${model.name}[]): string {

}

`);

    return ts.toString(filename);
  }
}
