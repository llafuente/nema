"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("../src/Api");
const Angular5Client_1 = require("../src/generators/Angular5Client");
const Parameter_1 = require("../src/Parameter");
const ava_1 = require("ava");
let api;
ava_1.default.cb.serial("parse global parameters", (t) => {
    api = Api_1.Api.parseSwaggerFile("./test/angular5client-parameters.yaml");
    //console.log(JSON.stringify(api.methods, null, 2));
    api.sort();
    t.deepEqual(Object.keys(api.methods), [
        'getUser',
    ], "all methods added");
    t.deepEqual(Object.keys(api.models), [
        "UserDto",
    ], "all methods added");
    t.is(api.methods.getUser.countParams(Parameter_1.ParameterType.PATH, false), 1);
    t.is(api.methods.getUser.countParams(Parameter_1.ParameterType.PATH, true), 1);
    api.methods.getUser.eachPathParam((param) => {
        t.is(param.name, "userId");
        t.is(param.type.toTypeScriptType(), "number");
    });
    Angular5Client_1.Angular5Client.generate(api, `./test/angular5client-parameters/`, false);
    t.end();
});
//# sourceMappingURL=angular5client-parameters.js.map