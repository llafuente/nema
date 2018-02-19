import { Api } from "../src/Api";
import { Angular5Client } from "../src/generators/Angular5Client";
import { Mongoose } from "../src/generators/Mongoose";
import { Express } from "../src/generators/Express";
import { ParameterType } from "../src/Parameter";
import test from "ava";
import { validateTypes } from "./common";

let api: Api;
test.cb.serial("parse swagger file", (t) => {
  api = Api.parseSwaggerFile("./test/responses-references.yaml", false);
  validateTypes(api, t);

  //console.log(JSON.stringify(api.methods.getStrategies, null, 2));

  api.sort();

  t.deepEqual(Object.keys(api.methods), [
    'getUser',
  ], "all methods added");
  t.deepEqual(Object.keys(api.models), [
    'HttpError',
    'UserDto',
  ], "all methods added");
  t.deepEqual(Object.keys(api.responses), [
    'NotFound',
    'Unauthorized',
  ], "all methods added");

  t.is(api.responses.NotFound.type.toTypeScriptType(), "HttpError", "NotFound type is HttpError");
  t.is(api.responses.Unauthorized.type.toTypeScriptType(), "HttpError", "Unauthorized type is HttpError");
  t.deepEqual(api.getReference("#/responses/Unauthorized"), api.responses.Unauthorized, "Unauthorized resolved ok");

  t.deepEqual(Object.keys(api.enums), [], "all methods added");

  t.end();
});

test.cb.serial("angular 5 generation", (t) => {
  (new Angular5Client(`./test/responses-references-client/`, api)).generate(true, false);
  t.end();
});

test.cb.serial("express generation", (t) => {
   Mongoose.generate(api, `./test/responses-references-server/`, false, false);
   (new Express(`./test/responses-references-server/`)).generate(api, true, false);
   t.end();
 });
