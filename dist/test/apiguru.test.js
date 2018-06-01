"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("../src/Api");
const Angular5Client_1 = require("../src/generators/Angular5Client");
const ava_1 = require("ava");
let api;
ava_1.default.cb.serial("parse global parameters", (t) => {
    api = Api_1.Api.parseSwaggerFile("./test/apiguru/aws.workmail.yaml");
    //console.log(JSON.stringify(api.methods, null, 2));
    api.sort();
    (new Angular5Client_1.Angular5Client(`./test/apiguru/aws.workmail/`, api)).generate(true, false);
    t.end();
});
//# sourceMappingURL=apiguru.test.js.map