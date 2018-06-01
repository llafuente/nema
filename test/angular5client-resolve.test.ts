import { Api } from "../src/Api";
import { Angular5Api } from "../src/generators/Angular5Api";
import { ParameterType } from "../src/Parameter";
import test from "ava";

let api: Api;
test.cb.serial("parse swagger file", (t) => {
  api = Api.parseSwaggerFile("./test/angular5client-resolve.yaml");

  //console.log(JSON.stringify(api.methods.getStrategies, null, 2));

  api.sort();

  t.deepEqual(Object.keys(api.methods), [
    "getStrategies",
  ], "all methods added");
  t.deepEqual(Object.keys(api.models), [
    "StrategyDto",
    "StringStringMap",
  ], "all methods added");

  t.is(api.methods.getStrategies.countParams(ParameterType.PATH, false), 1);
  t.is(api.methods.getStrategies.countParams(ParameterType.PATH, true), 1);

  t.is(api.methods.getStrategies.countParams(ParameterType.HEADER, false), 1);
  t.is(api.methods.getStrategies.countParams(ParameterType.HEADER, true), 0);

  (new Angular5Api(`./test/angular5client-resolve/`, api)).generate(true, false);
  t.end();
});
