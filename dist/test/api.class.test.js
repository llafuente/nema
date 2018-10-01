"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("../src/Api");
const Config_1 = require("../src/Config");
const AngularApi_1 = require("../src/generators/AngularApi");
const ava_1 = require("ava");
const path = require("path");
const nema_1 = require("../src/nema");
let api;
ava_1.default.cb.serial("parse swagger", (t) => {
    nema_1.parseAndConvert(path.join(__dirname, "..", "..", "test", "swaggers", "api-test-001.yaml"), (openApi3) => {
        api = Api_1.Api.parseOpenApi("api-test-001", path.join(__dirname, "..", "..", "test", "generated", "api-test-001.yaml"), openApi3);
        t.end();
    });
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
    const config = new Config_1.Config(path.join(__dirname, `../test-generated/api-test-001/`), api, true, false, true);
    new AngularApi_1.AngularApi(config);
    t.end();
});
//# sourceMappingURL=api.class.test.js.map