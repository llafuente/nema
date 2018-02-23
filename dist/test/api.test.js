"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("../src/Api");
const Angular5Client_1 = require("../src/generators/Angular5Client");
const ava_1 = require("ava");
let swagger;
ava_1.default.cb.serial("parse swagger", (t) => {
    swagger = Api_1.Api.parseSwaggerFile("./test/api-test-001.yaml");
    //console.log(JSON.stringify(swagger.methods.initStrategyRest, null, 2));
    t.deepEqual(Object.keys(swagger.methods), [
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
    t.deepEqual(Object.keys(swagger.models), [
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
    t.deepEqual(swagger.models.ParametersDto.type.toTypeScriptType(), "ParametersDto", "typescript type ok");
    t.deepEqual(swagger.methods.createStrategyRest.parameters.map((x) => x.type.toTypeScriptType()), ["string", "string"], "typescript type ok");
    t.deepEqual(swagger.methods.initStrategyRest.parameters.map((x) => x.type.toTypeScriptType()), ["InitiParametersDto", "string"], "typescript type ok");
    t.deepEqual(swagger.models.OrderMonitoring.extends, "#/definitions/MonitoringDto", "type extends");
    t.deepEqual(Object.keys(swagger.models.OrderMonitoring.type.properties), ["type", "quantity", "monitoringType"], "type extends parsed ok");
    (new Angular5Client_1.Angular5Client(`./test/api-test-001/`, swagger)).generate(true, false);
    t.end();
});
//# sourceMappingURL=api.test.js.map