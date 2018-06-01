import { Api } from "../src/Api";
import { Angular5Client } from "../src/generators/Angular5Client";
import { ParameterType } from "../src/Parameter";
import test from "ava";

let api: Api;
test.cb.serial("parse global parameters", (t) => {
  api = Api.parseSwaggerFile("./test/apiguru/aws.workmail.yaml");

  //console.log(JSON.stringify(api.methods, null, 2));

  api.sort();

  (new Angular5Client(`./test/apiguru/aws.workmail/`, api)).generate(true, false);
  t.end();
});
