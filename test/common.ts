import { Api } from "../src/Api";
import { CallbackTestContext } from "ava";

export function validateTypes(api: Api, t: CallbackTestContext) {
  api.eachMethod((method) => {
    method.eachResponse((response) => {
      t.deepEqual(response.type.type != null, true, `invalid type: ${JSON.stringify(response.type, null, 2)}`);
    });
  });
}
