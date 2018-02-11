"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function validateTypes(api, t) {
    api.eachMethod((method) => {
        method.eachResponse((response) => {
            t.deepEqual(response.type.type != null, true, `invalid type: ${JSON.stringify(response.type, null, 2)}`);
        });
    });
}
exports.validateTypes = validateTypes;
//# sourceMappingURL=common.js.map