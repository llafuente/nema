"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Type_1 = require("./Type");
const utils_1 = require("./utils");
class Response {
    static parseSwagger(api, httpCode, obj) {
        console.log(obj);
        const r = new Response();
        r.httpCode = httpCode == "default" ? 0 : parseInt(httpCode, 10);
        if (obj.$ref) {
            r.reference = obj.$ref;
        }
        else {
            r.description = obj.description;
            const c = obj.content;
            if (c) {
                const c2 = utils_1.checkContent(c, obj);
                const k = Object.keys(c);
                r.encoding = k[0];
                r.type = Type_1.Type.parseSwagger(api, c[k[0]].schema, null, false);
            }
            else {
                r.type = Type_1.Type.void();
            }
        }
        return r;
    }
}
exports.Response = Response;
//# sourceMappingURL=Response.js.map