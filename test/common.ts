import { Api } from "../src/Api";
import { CallbackTestContext } from "ava";
import * as path from "path";

export function validateTypes(api: Api, t: CallbackTestContext) {
  api.eachMethod((method) => {
    method.eachResponse((response) => {
      t.deepEqual(response.type.type != null, true, `invalid type: ${JSON.stringify(response.type, null, 2)}`);
    });
  });
}

export function parse(filename: string, sort = true) : Api {
  const api = Api.parseOpenApiFile(path.join(__dirname, "..", "..", "test", filename));
  if (sort) {
    api.sort();
  }
  return api;
}
