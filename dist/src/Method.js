"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Parameter_1 = require("./Parameter");
const Response_1 = require("./Response");
const _ = require("lodash");
class Method {
    constructor() {
        this.api = null;
        this.filename = null;
        /**
         * Method relative URL, in the final generation we will append
         * api.frontBasePath or api.basePath
         */
        this.url = null;
        /**
         * Unique name for this method. Will be used as method/function name
         * in the generators
         */
        this.operationId = null;
        /** http verb: get, post... */
        this.verb = null;
        this.description = null;
        /** List of parameters */
        this.parameters = [];
        /** List of responses */
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
        if (!method.operationId) {
            console.error(method);
            throw new Error(`operationId is required at ${api.filename}`);
        }
        m.operationId = method.operationId;
        m.filename = `/src/routes/${method.operationId}.ts`;
        m.description = method.description;
        m.consumes = consumes;
        m.produces = produces;
        m.parameters = parameters.map((x) => {
            return Parameter_1.Parameter.parseSwagger(api, x);
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
            m.responses.push(Response_1.Response.parseSwagger(api, responseType, response));
        });
        // check no multiple success responses allowed
        let oks = 0;
        m.responses.forEach((response) => {
            if (response.httpCode >= 200 && response.httpCode < 300) {
                ++oks;
            }
        });
        if (oks > 1) {
            console.error(method);
            throw new Error(`invalid responses, multiple success responses found at ${api.filename}`);
        }
        //end-check
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
            if (p.reference) {
                p = this.api.getReference(p.reference);
            }
            if ((filter === null || filter === p.in) && !(skipAutoInjected === true && p.autoInjected === true)) {
                ++count;
            }
        }
        return count;
    }
    /**
     * Loop each parameter in "arguments order" resolving any references
     * order: path, header, query, body, file
     */
    eachParam(cb) {
        this.eachPathParam(cb);
        this.eachHeaderParam(cb, true);
        this.eachQueryParam(cb);
        this.eachBodyParam(cb);
        this.eachFileParam(cb);
    }
    /** Loop each parameter of query path resolving any references */
    eachPathParam(cb) {
        this.parameters.forEach((p) => {
            if (p.reference) {
                p = this.api.getReference(p.reference);
            }
            if (p.in == Parameter_1.ParameterType.PATH) {
                cb(p);
            }
        });
    }
    /** Loop each parameter of query header resolving any references */
    eachQueryParam(cb) {
        this.parameters.forEach((p) => {
            if (p.reference) {
                p = this.api.getReference(p.reference);
            }
            if (p.in == Parameter_1.ParameterType.QUERY) {
                cb(p);
            }
        });
    }
    /** Loop each parameter of type header resolving any references */
    eachHeaderParam(cb, skipAutoInjected) {
        this.parameters.forEach((p) => {
            if (p.reference) {
                p = this.api.getReference(p.reference);
            }
            if (p.in == Parameter_1.ParameterType.HEADER && (!skipAutoInjected || (skipAutoInjected && !p.autoInjected))) {
                cb(p);
            }
        });
    }
    /** Loop each parameter of type cookie resolving any references */
    eachCookieParam(cb) {
        this.parameters.forEach((p) => {
            if (p.reference) {
                p = this.api.getReference(p.reference);
            }
            if (p.in == Parameter_1.ParameterType.COOKIE) {
                cb(p);
            }
        });
    }
    /** Loop each parameter of type body resolving any references */
    eachBodyParam(cb) {
        this.parameters.forEach((p) => {
            if (p.reference) {
                p = this.api.getReference(p.reference);
            }
            if (p.in == Parameter_1.ParameterType.BODY) {
                cb(p);
            }
        });
    }
    /** Loop each parameter of type file resolving any references */
    eachFileParam(cb) {
        this.parameters.forEach((p) => {
            if (p.reference) {
                p = this.api.getReference(p.reference);
            }
            if (p.in == Parameter_1.ParameterType.FORM_DATA_FILE) {
                cb(p);
            }
        });
    }
    /** Get accept header contents */
    getAccept() {
        if (this.producesJSON()) {
            return "application/json";
        }
        if (this.produces.indexOf("text/plain") !== -1) {
            return "text/plain";
        }
        if (this.produces.indexOf("text/html") !== -1) {
            return "text/html";
        }
        return this.produces[0];
    }
    producesJSON() {
        return this.produces.indexOf("application/json") !== -1;
    }
    producesText() {
        return this.produces.indexOf("text/plain") !== -1 || this.produces.indexOf("text/html") !== -1;
    }
    producesBlob() {
        return this.produces.some((produce) => {
            return produce.indexOf("image/") == 0;
        });
    }
    /**
     * The method require body?
     */
    requireBody() {
        return ["post", "patch", "put"].indexOf(this.verb) !== -1;
    }
    /**
     * returns a response between [200, 300)
     * or returns the default response
     */
    getSuccessResponse() {
        for (let response of this.responses) {
            if (response.httpCode >= 200 && response.httpCode < 300) {
                return response;
            }
        }
        return this.getResponse(0);
    }
    /**
     * returns a the response for given httpCode if found,
     * default response if not.
     */
    getResponse(httpCode) {
        for (let response of this.responses) {
            if (response.httpCode == httpCode) {
                return response;
            }
        }
        if (httpCode != 0) {
            return this.getResponse(0);
        }
        return null;
    }
    /**
     * Loop each response resolving any reference
     */
    eachResponse(cb) {
        _.each(this.responses, (response) => {
            if (response.reference) {
                // create a new one, http from here, the rest from the reference
                const r = new Response_1.Response();
                _.assign(r, this.api.getReference(response.reference));
                r.httpCode = response.httpCode;
                cb(r);
            }
            else {
                cb(response);
            }
        });
    }
}
exports.Method = Method;
//# sourceMappingURL=Method.js.map