import { Api } from "../src/Api";
import { Angular5Api } from "../src/generators/Angular5Api";
import { ParameterType } from "../src/Parameter";
import test from "ava";

let api: Api;
test.cb.serial("parse global parameters", (t) => {
  api = Api.parseSwaggerFile("./test/apiguru/aws.workmail.yaml");

  //console.log(JSON.stringify(api.methods, null, 2));

  api.sort();

  (new Angular5Api(`./test/apiguru/aws.workmail/`, api)).generate(true, false);
  t.end();
});
