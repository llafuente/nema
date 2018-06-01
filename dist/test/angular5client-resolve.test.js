"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("../src/Api");
const Angular5Api_1 = require("../src/generators/Angular5Api");
const Parameter_1 = require("../src/Parameter");
const ava_1 = require("ava");
let api;
ava_1.default.cb.serial("parse swagger file", (t) => {
    api = Api_1.Api.parseSwaggerFile("./test/angular5client-resolve.yaml");
    //console.log(JSON.stringify(api.methods.getStrategies, null, 2));
    api.sort();
    t.deepEqual(Object.keys(api.methods), [
        "getStrategies",
    ], "all methods added");
    t.deepEqual(Object.keys(api.models), [
        "StrategyDto",
        "StringStringMap",
    ], "all methods added");
    t.is(api.methods.getStrategies.countParams(Parameter_1.ParameterType.PATH, false), 1);
    t.is(api.methods.getStrategies.countParams(Parameter_1.ParameterType.PATH, true), 1);
    t.is(api.methods.getStrategies.countParams(Parameter_1.ParameterType.HEADER, false), 1);
    t.is(api.methods.getStrategies.countParams(Parameter_1.ParameterType.HEADER, true), 0);
    (new Angular5Api_1.Angular5Api(`./test/angular5client-resolve/`, api)).generate(true, false);
    t.end();
});
//# sourceMappingURL=angular5client-resolve.test.js.map