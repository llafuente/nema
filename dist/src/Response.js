"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Type_1 = require("./Type");
class Response {
    static parseSwagger(httpCode, obj) {
        const r = new Response();
        r.httpCode = httpCode == "default" ? 0 : parseInt(httpCode, 10);
        r.description = obj.description;
        r.type = Type_1.Type.parseSwagger(obj.schema || obj);
        return r;
    }
}
exports.Response = Response;
//# sourceMappingURL=Response.js.map