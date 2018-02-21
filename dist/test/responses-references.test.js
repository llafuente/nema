"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("../src/Api");
const Angular5Client_1 = require("../src/generators/Angular5Client");
const Mongoose_1 = require("../src/generators/Mongoose");
const Express_1 = require("../src/generators/Express");
const ava_1 = require("ava");
const common_1 = require("./common");
let api;
ava_1.default.cb.serial("parse swagger file", (t) => {
    api = Api_1.Api.parseSwaggerFile("./test/responses-references.yaml");
    common_1.validateTypes(api, t);
    //console.log(JSON.stringify(api.methods.getStrategies, null, 2));
    api.sort();
    t.deepEqual(Object.keys(api.methods), [
        'getUser',
    ], "all methods added");
    t.deepEqual(Object.keys(api.models), [
        'HttpError',
        'UserDto',
    ], "all methods added");
    t.deepEqual(Object.keys(api.responses), [
        'NotFound',
        'Unauthorized',
    ], "all methods added");
    t.is(api.responses.NotFound.type.toTypeScriptType(), "HttpError", "NotFound type is HttpError");
    t.is(api.responses.Unauthorized.type.toTypeScriptType(), "HttpError", "Unauthorized type is HttpError");
    t.deepEqual(api.getReference("#/responses/Unauthorized"), api.responses.Unauthorized, "Unauthorized resolved ok");
    t.deepEqual(Object.keys(api.enums), [], "all methods added");
    t.end();
});
ava_1.default.cb.serial("angular 5 generation", (t) => {
    (new Angular5Client_1.Angular5Client(`./test/responses-references-client/`, api)).generate(true, false);
    t.end();
});
ava_1.default.cb.serial("express generation", (t) => {
    (new Express_1.Express(`./test/responses-references-server/`, api)).generate(true, false);
    (new Mongoose_1.Mongoose(`./test/responses-references-server/`, api)).generate(false, false);
    t.end();
});
//# sourceMappingURL=responses-references.test.js.map