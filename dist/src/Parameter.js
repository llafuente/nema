"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Type_1 = require("./Type");
const utils_1 = require("./utils");
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
const varNameRE = new RegExp("^[^a-zA-Z_]+|[^a-zA-Z_0-9]+", "g");
class Parameter {
    constructor() {
        this.api = null;
        /** variable/real name (no dashes) */
        this.name = null;
        /** real header name (may contain dashes) */
        this.headerName = null;
        this.description = null;
        /** parameter location */
        this.in = null;
        this.required = false;
        this.reference = null;
        this.type = null;
    }
    /**
     * documentation: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#parameterObject
     */
    static parseOpenApi(api, obj) {
        const p = new Parameter();
        Object.defineProperty(p, "api", { value: api, writable: true, enumerable: false });
        p.required = !!obj.required;
        p.reference = obj.$ref || null;
        // $ref do not need anything more to parse
        if (!p.reference) {
            if (!obj.name) {
                console.error(obj);
                throw new Error("ParameterObject.name is required");
            }
            if (!obj.in) {
                console.error(obj);
                throw new Error("ParameterObject.in is required");
            }
            p.name = obj.name.replace(varNameRE, "_");
            p.headerName = obj.name;
            if (p.name != p.headerName) {
                p.name = utils_1.camelcase(p.name);
            }
            // TODO REVIEW
            // NOTE: x-nema-header was removed only legacy behaviour
            if (obj["x-alias"]) {
                p.name = obj.name; // name must be valid in this case!
                p.headerName = obj["x-alias"];
            }
            p.in = swaggerToParameterType[obj.in];
            p.type = Type_1.Type.parseSwagger(api, obj.schema || obj, null, false);
            p.description = obj.description;
            p.autoInjected = !!obj["x-auto-injected"] || !!obj["x-front-auto-injected"] || !!obj["x-nema-auto-injected"];
        }
        // TODO resonable?
        // // no array / objects
        // let t = p.type;
        // if (p.reference) {
        //   t = api.getReference<Model>(p.reference).type;
        // }
        // switch(t.type) {
        //   case Kind.DATE:
        //   case Kind.STRING:
        //   case Kind.NUMBER:
        //   default:
        //     throw new Limitation("Headers type must be a string, number or Date");
        // }
        return p;
    }
}
exports.Parameter = Parameter;
//# sourceMappingURL=Parameter.js.map