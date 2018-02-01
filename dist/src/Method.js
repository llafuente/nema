"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Parameter_1 = require("./Parameter");
const Response_1 = require("./Response");
const _ = require("lodash");
class Method {
    constructor() {
        this.api = null;
        /*
         * Method relative URL, in the final generation we will append api.frontBasePath or api.basePath
         */
        this.url = null;
        this.operationId = null;
        this.verb = null;
        this.description = null;
        this.parameters = [];
        this.responses = [];
        this.consumes = [];
        this.produces = [];
        this.resolve = null;
    }
    static parseSwagger(api, verb, url, parameters, consumes, produces, method) {
        const m = new Method();
        Object.defineProperty(m, "api", { value: api, writable: true, enumerable: false });
        m.verb = verb.toLowerCase();
        m.url = url;
        m.operationId = method.operationId;
        m.description = method.description;
        m.consumes = consumes;
        m.produces = produces;
        m.parameters = parameters.map((x) => {
            return Parameter_1.Parameter.parseSwagger(x);
        });
        // Keep compat with our legacy generator
        // this is out of the swagger standard, sry
        if (Array.isArray(method.responses)) {
            const responses = {};
            method.responses.forEach((r) => {
                _.each(r, (response, httpCode) => {
                    responses[httpCode] = response;
                });
            });
            method.responses = responses;
        }
        _.each(method.responses, (response, responseType) => {
            m.responses.push(Response_1.Response.parseSwagger(responseType, response));
        });
        // TODO check format!
        if (method["x-front-resolve"]) {
            console.warn(`deprecated usage: x-front-resolve, parsing ${api.filename}`);
        }
        m.resolve = method["x-front-resolve"] || method["x-nema-resolve"] || null;
        if (method["x-override-front"]) {
            console.warn(`deprecated usage: x-override-front, parsing ${api.filename}`);
        }
        // very unsafe :)
        const override = method["x-override-front"] || method["x-nema-override"] || {};
        _.assign(m, override);
        return m;
    }
    countParams(filter = null, skipAutoInjected) {
        let count = 0;
        for (let p of this.parameters) {
            if ((filter === null || filter === p.in) && !(skipAutoInjected === true && p.autoInjected === true)) {
                ++count;
            }
        }
        return count;
    }
    eachPathParam(cb) {
        this.parameters.forEach((p) => {
            if (p.in == Parameter_1.ParameterType.PATH) {
                cb(p);
            }
        });
    }
    eachQueryParam(cb) {
        this.parameters.forEach((p) => {
            if (p.in == Parameter_1.ParameterType.QUERY) {
                cb(p);
            }
        });
    }
    eachHeaderParam(cb, skipAutoInjected) {
        this.parameters.forEach((p) => {
            if (p.in == Parameter_1.ParameterType.HEADER && (!skipAutoInjected || (skipAutoInjected && !p.autoInjected))) {
                cb(p);
            }
        });
    }
    eachCookieParam(cb) {
        this.parameters.forEach((p) => {
            if (p.in == Parameter_1.ParameterType.COOKIE) {
                cb(p);
            }
        });
    }
    eachBodyParam(cb) {
        this.parameters.forEach((p) => {
            if (p.in == Parameter_1.ParameterType.BODY) {
                cb(p);
            }
        });
    }
    producesJSON() {
        return this.produces.indexOf("application/json") !== -1;
    }
    producesText() {
        return this.produces.indexOf("text/plain") !== -1 || this.produces.indexOf("text/html") !== -1;
    }
    requireBody() {
        return ["post", "patch", "put"].indexOf(this.verb) !== -1;
    }
    getResponse(httpCode) {
        for (let response of this.responses) {
            if (response.httpCode == httpCode) {
                return response;
            }
        }
        return null;
    }
}
exports.Method = Method;
//# sourceMappingURL=Method.js.map