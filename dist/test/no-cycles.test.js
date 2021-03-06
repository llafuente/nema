"use strict";
/**
* this test aims to detect cycles in the Api class
* parse all files an try it!
*/
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("../src/Api");
const ava_1 = require("ava");
function isCyclic(filename, t, obj2) {
    const seenObjects = [];
    function detect(obj) {
        if (obj && typeof obj === "object" && !Array.isArray(obj)) {
            if (seenObjects.indexOf(obj) !== -1) {
                return true;
            }
            seenObjects.push(obj);
            for (const key in obj) {
                if (obj.hasOwnProperty(key) && detect(obj[key])) {
                    t.fail(`cycle at ${key} parsing file ${filename}`);
                    return true;
                }
            }
        }
        return false;
    }
    return detect(obj2);
}
ava_1.default.cb.serial("parse swagger", (t) => {
    [
        "./test/api-test-001.yaml",
        "./test/angular5client-resolve.yaml",
    ].forEach((filename) => {
        const api = Api_1.Api.parseSwaggerFile(filename);
        isCyclic(filename, t, api);
    });
    t.end();
});
//# sourceMappingURL=no-cycles.test.js.map