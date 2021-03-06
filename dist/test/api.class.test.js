"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Angular5Api_1 = require("../src/generators/Angular5Api");
const ava_1 = require("ava");
const path = require("path");
const common_1 = require("./common");
let api;
ava_1.default.cb.serial("parse swagger", (t) => {
    api = common_1.parse("swaggers/api-test-001.yaml", false);
    //console.log(JSON.stringify(swagger.methods.initStrategyRest, null, 2));
    t.end();
});
ava_1.default.cb.serial("check methods", (t) => {
    t.deepEqual(Object.keys(api.methods), [
        "createStrategyRest",
        "initStrategyRest",
        "startStrategyRest",
        "pauseStrategyRest",
        "stopStrategyRest",
        "removeStrategyRest",
        "getAvailableStrategiesRest",
        "getActiveStrategiesRest",
        "getActiveStrategiesOfTypeRest",
        "getStrategyRest",
        "panicButtonStrategyRest",
        "panicButtonRest",
        "getDefinedParametersRest",
        "updateParametersRest",
        "getOrdersByStrategyRest",
        "getExecutionsByStrategyRest",
        "getStrategyLogMessagesRest",
        "getMarketStatus",
        "getErrorMessagesRest",
        "createGroup",
        "updateGroup",
        "getGroupById",
        "deleteAuthorizedGroup",
        "getAuthorizedGroups",
        "getAuthorizedGroupsOfUser",
        "getWeightById",
        "deleteWeight",
        "getAllWeights",
        "createWeight",
        "updateWeight",
        "getInstruments",
        "deleteInstrument",
        "createInstrument",
        "updateInstrument",
        "autoHedgerTypeStart",
        "autoHedgerTypeStop",
        "getAutoHedgerStatus",
        "getExecutionsByStrategyAndOrder",
    ], "all methods added");
    t.end();
});
ava_1.default.cb.serial("check models", (t) => {
    t.deepEqual(Object.keys(api.models), [
        "StrategyIdDto",
        "StringBooleanMap",
        "StringStringMap",
        "InitiParametersDto",
        "StrategyDto",
        "ParametersDto",
        "MonitoringDto",
        "OrderMonitoring",
        "ExecutionMonitoring",
        "StrategyLogDto",
        "Strategy",
        "AuthorizedGroup",
        "InstrumentDto",
        "Weight",
        "StrategyStatusMessage",
        "ParameterChangedMessage",
    ], "all models added");
    t.end();
});
ava_1.default.cb.serial("check models/methods", (t) => {
    t.deepEqual(api.models.ParametersDto.type.toTypeScriptType(), "ParametersDto", "typescript type ok");
    t.deepEqual(api.methods.createStrategyRest.parameters.map((x) => x.type.toTypeScriptType()), ["string", "string"], "typescript type ok");
    t.deepEqual(api.methods.initStrategyRest.parameters.map((x) => x.type.toTypeScriptType()), ["InitiParametersDto", "string"], "typescript type ok");
    t.deepEqual(api.models.OrderMonitoring.extends, "#/definitions/MonitoringDto", "type extends");
    t.deepEqual(Object.keys(api.models.OrderMonitoring.type.properties), ["type", "quantity", "monitoringType"], "type extends parsed ok");
    t.end();
});
ava_1.default.cb.serial("generate angular 5 api", (t) => {
    (new Angular5Api_1.Angular5Api(path.join(__dirname, `../test-generated/api-test-001/`), api)).generate(true, false);
    t.end();
});
//# sourceMappingURL=api.class.test.js.map