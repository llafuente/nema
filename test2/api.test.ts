import { Api } from "../src/Api";
import { Angular5Api } from "../src/generators/Angular5Api";
import test from "ava";
import * as path from "path";

let api: Api;
test.cb.serial("parse swagger", (t) => {
  api = Api.parseSwaggerFile("./test/api-test-001.yaml");

  //console.log(JSON.stringify(swagger.methods.initStrategyRest, null, 2));

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

  t.deepEqual(api.models.ParametersDto.type.toTypeScriptType(), "ParametersDto", "typescript type ok");
  t.deepEqual(
    api.methods.createStrategyRest.parameters.map((x) => x.type.toTypeScriptType()),
    ["string", "string"],
    "typescript type ok",
  );
  t.deepEqual(
    api.methods.initStrategyRest.parameters.map((x) => x.type.toTypeScriptType()),
    ["InitiParametersDto", "string"],
    "typescript type ok",
  );

  t.deepEqual(
    api.models.OrderMonitoring.extends, "#/definitions/MonitoringDto", "type extends",
  );

  t.deepEqual(
    Object.keys(api.models.OrderMonitoring.type.properties),
    ["type", "quantity", "monitoringType"], "type extends parsed ok",
  );

  (new Angular5Api(path.join(__dirname, `../test-generated/api-test-001/`), api)).generate(true, false);

  t.end();
});
