"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Type_1 = require("./Type");
class Response {
    static parseSwagger(api, httpCode, obj) {
        const r = new Response();
        r.httpCode = httpCode == "default" ? 0 : parseInt(httpCode, 10);
        r.description = obj.description;
        r.type = Type_1.Type.parseSwagger(api, obj.schema || obj, null, false);
        return r;
    }
}
exports.Response = Response;
//# sourceMappingURL=Response.js.map