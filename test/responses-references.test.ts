import { Api } from "../src/Api";
import { Angular5Client } from "../src/generators/Angular5Client";
import { Mongoose } from "../src/generators/Mongoose";
import { Express } from "../src/generators/Express";
import { ParameterType } from "../src/Parameter";
import test from "ava";
import { validateTypes } from "./common";

let api: Api;
test.cb.serial("parse swagger file", (t) => {
  api = Api.parseSwaggerFile("./test/responses-references.yaml");
  validateTypes(api, t);

  //console.log(JSON.stringify(api.methods.getStrategies, null, 2));

  api.sort();

  t.deepEqual(Object.keys(api.methods), [
    'getUser',
  ], "all methods added");
  t.deepEqual(Object.keys(api.models), [
    'Error',
    'UserDto',
  ], "all methods added");
  t.deepEqual(Object.keys(api.responses), [
    'NotFound',
    'Unauthorized',
  ], "all methods added");

  t.is(api.responses.NotFound.type.toTypeScriptType(), "Error", "NotFound type is Error");
  t.is(api.responses.Unauthorized.type.toTypeScriptType(), "Error", "Unauthorized type is Error");
  t.deepEqual(api.getReference("#/responses/Unauthorized"), api.responses.Unauthorized, "Unauthorized resolved ok");

  t.deepEqual(Object.keys(api.enums), [], "all methods added");

  t.end();
});

test.cb.serial("angular 5 generation", (t) => {
  (new Angular5Client(`./test/responses-references-client/`)).generate(api, false);
  t.end();
});

test.cb.serial("express generation", (t) => {
   Mongoose.generate(api, `./test/responses-references-server/`, false);
   (new Express(`./test/responses-references-server/`)).generate(api, false);
   t.end();
 });
