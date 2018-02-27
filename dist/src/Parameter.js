"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Type_1 = require("./Type");
var ParameterType;
(function (ParameterType) {
    ParameterType["PATH"] = "path";
    ParameterType["QUERY"] = "query";
    ParameterType["HEADER"] = "header";
    ParameterType["BODY"] = "body";
    ParameterType["COOKIE"] = "cookie";
    ParameterType["FORM_DATA_FILE"] = "file";
})(ParameterType = exports.ParameterType || (exports.ParameterType = {}));
const swaggerToParameterType = {
    path: ParameterType.PATH,
    query: ParameterType.QUERY,
    header: ParameterType.HEADER,
    cookie: ParameterType.COOKIE,
    // NOTE swagger 3 heavely modified this :S
    body: ParameterType.BODY,
    formData: ParameterType.BODY,
};
class Parameter {
    constructor() {
        this.api = null;
    }
    static parseSwagger(api, obj) {
        const p = new Parameter();
        Object.defineProperty(p, "api", { value: api, writable: true, enumerable: false });
        p.name = obj.name;
        p.headerName = obj["x-alias"] || obj["x-nema-header"];
        p.autoInjected = !!obj["x-auto-injected"] || !!obj["x-front-auto-injected"] || !!obj["x-nema-auto-injected"];
        p.description = obj.description;
        if (obj.in == "formData" && obj.type == "file") {
            p.in = ParameterType.FORM_DATA_FILE;
        }
        else {
            p.in = swaggerToParameterType[obj.in];
        }
        p.required = !!obj.required;
        p.reference = obj.$ref || null;
        // do not parse $ref as type...
        if (p.reference) {
            p.type = null;
        }
        else {
            p.type = Type_1.Type.parseSwagger(api, obj.schema || obj, null, false);
        }
        return p;
    }
}
exports.Parameter = Parameter;
//# sourceMappingURL=Parameter.js.map