"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Parameter_1 = require("./Parameter");
const Response_1 = require("./Response");
const Type_1 = require("./Type");
const _ = require("lodash");
const utils_1 = require("./utils");
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
         * Unique name for this operation. Will be used as method/function name
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
        this.body = null;
        this.resolve = null;
    }
    static parseOpenApi(api, verb, url, parameters, operation) {
        const m = new Method();
        console.info("parsing operation:", verb + ":" + url);
        Object.defineProperty(m, "api", { value: api, writable: true, enumerable: false });
        m.verb = verb.toLowerCase();
        m.url = url;
        if (!operation.operationId) {
            console.error(operation);
            throw new utils_1.Limitation(`operationId is required at ${api.filename}`);
        }
        m.operationId = operation.operationId;
        m.filename = `/src/routes/${operation.operationId}.ts`;
        m.description = operation.description;
        m.parameters = parameters.map((x) => {
            return Parameter_1.Parameter.parseOpenApi(api, x);
        });
        const body = operation.requestBody;
        if (body && body.content) {
            utils_1.checkContent(body.content, m);
            const k = Object.keys(body.content);
            m.body = {
                encoding: k[0],
                required: !!body.required,
                type: Type_1.Type.parseSwagger(api, body.content[k[0]].schema, null, false)
            };
        }
        _.each(operation.responses, (response, responseType) => {
            m.responses.push(Response_1.Response.parseSwagger(api, responseType, response));
        });
        // check no multiple success responses allowed
        let oks = 0;
        let encodings = [];
        m.responses.forEach((response) => {
            if (response.httpCode >= 200 && response.httpCode < 300) {
                ++oks;
            }
            if (response.encoding && encodings.indexOf(response.encoding) === -1) {
                encodings.push(response.encoding);
            }
        });
        if (oks > 1) {
            console.error(operation);
            throw new utils_1.Limitation(`invalid responses, multiple success responses found at ${api.filename}`);
        }
        if (encodings.length > 1) {
            console.error(m);
            throw new utils_1.Limitation(`invalid responses, multiple encodings found at ${api.filename}`);
        }
        //end-check
        // TODO check format!
        if (operation["x-front-resolve"]) {
            console.error(m);
            throw new utils_1.Deprecation(`deprecated usage: x-front-resolve, parsing ${api.filename}`);
        }
        // TODO check format!
        m.resolve = operation["x-nema-resolve"] || null;
        if (operation["x-override-front"]) {
            console.error(m);
            throw new utils_1.Deprecation(`deprecated usage: x-override-front, parsing ${api.filename}`);
        }
        // very unsafe :) and powerfull ^.^
        _.assign(m, operation["x-nema-override"] || {});
        return m;
    }
    hasBody() {
        return this.body !== null;
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
    getEnconding() {
        for (let response of this.responses) {
            if (response.encoding) {
                return response.encoding;
            }
        }
        return null;
    }
    /** Get accept header contents */
    getAccept() {
        return [this.getEnconding()];
    }
    producesJSON() {
        const enconding = this.getEnconding();
        return enconding && enconding == "application/json";
    }
    producesText() {
        const enconding = this.getEnconding();
        return enconding && enconding.indexOf("text/") !== -1;
    }
    producesBlob() {
        return this.getEnconding() != null && !this.producesJSON() && !this.producesText();
    }
    /**
     * returns a response between [200, 300)
     * or returns the default response
     */
    getSuccessResponse() {
        for (const response of this.responses) {
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
        for (const response of this.responses) {
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