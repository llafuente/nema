"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Type_1 = require("./Type");
var ParameterType;
(function (ParameterType) {
    ParameterType[ParameterType["PATH"] = 0] = "PATH";
    ParameterType[ParameterType["QUERY"] = 1] = "QUERY";
    ParameterType[ParameterType["HEADER"] = 2] = "HEADER";
    ParameterType[ParameterType["BODY"] = 3] = "BODY";
    ParameterType[ParameterType["COOKIE"] = 4] = "COOKIE";
})(ParameterType = exports.ParameterType || (exports.ParameterType = {}));
;
const SwaggerToParameterType = {
    "path": ParameterType.PATH,
    "query": ParameterType.QUERY,
    "header": ParameterType.HEADER,
    "cookie": ParameterType.COOKIE,
    // NOTE swagger 3 heavely modified this :S
    "body": ParameterType.BODY,
};
class Parameter {
    static parseSwagger(obj) {
        const p = new Parameter();
        p.name = obj.name;
        p.headerName = obj["x-alias"] || obj["x-nema-header"];
        p.autoInjected = !!obj["x-auto-injected"] || !!obj["x-front-auto-injected"] || !!obj["x-nema-auto-injected"];
        p.description = obj.description;
        p.in = SwaggerToParameterType[obj.in];
        p.required = !!obj.required;
        p.reference = obj.$ref || null;
        // do not parse $ref as type...
        if (p.reference) {
            p.type = null;
        }
        else {
            p.type = Type_1.Type.parseSwagger(obj.schema || obj, null, false);
        }
        return p;
    }
}
exports.Parameter = Parameter;
//# sourceMappingURL=Parameter.js.map