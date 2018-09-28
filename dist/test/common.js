"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function validateTypes(api, t) {
    api.eachMethod((method) => {
        method.eachResponse((response) => {
            t.deepEqual(response.type.type != null, true, `invalid type: ${JSON.stringify(response.type, null, 2)}`);
        });
    }, true);
}
exports.validateTypes = validateTypes;
function parse(filename, sort = true) {
    /*
    const api = Api.parseOpenApiFile(path.join(__dirname, "..", "..", "test", filename));
    if (sort) {
      api.sort();
    }
    return api;
    */
    return null;
}
exports.parse = parse;
//# sourceMappingURL=common.js.map