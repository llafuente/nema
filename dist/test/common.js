"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("../src/Api");
const path = require("path");
function validateTypes(api, t) {
    api.eachMethod((method) => {
        method.eachResponse((response) => {
            t.deepEqual(response.type.type != null, true, `invalid type: ${JSON.stringify(response.type, null, 2)}`);
        });
    });
}
exports.validateTypes = validateTypes;
function parse(filename, sort = true) {
    const api = Api_1.Api.parseSwaggerFile(path.join(__dirname, "..", "..", "test", filename));
    if (sort) {
        api.sort();
    }
    return api;
}
exports.parse = parse;
//# sourceMappingURL=common.js.map