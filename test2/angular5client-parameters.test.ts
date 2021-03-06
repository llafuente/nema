import { Api } from "../src/Api";
import { Angular5Api } from "../src/generators/Angular5Api";
import { ParameterType } from "../src/Parameter";
import test from "ava";
import * as path from "path";

let api: Api;
test.cb.serial("parse global parameters", (t) => {
  api = Api.parseSwaggerFile("./test/angular5client-parameters.yaml");

  //console.log(JSON.stringify(api.methods, null, 2));

  api.sort();

  t.deepEqual(Object.keys(api.methods), [
    "getUser",
  ], "all methods added");

  t.deepEqual(Object.keys(api.models), [
    "UserDto",
  ], "all methods added");

  t.is(api.methods.getUser.countParams(ParameterType.PATH, false), 1);
  t.is(api.methods.getUser.countParams(ParameterType.PATH, true), 1);
  api.methods.getUser.eachPathParam((param) => {
    t.is(param.name, "userId");
    t.is(param.type.toTypeScriptType(), "number");
  });

  (new Angular5Api(path.join(__dirname, `../test-generated/angular5client-parameters/`), api)).generate(true, false);
  t.end();
});
