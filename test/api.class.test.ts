import { Api } from "../src/Api";
import { Config } from "../src/Config";
import { AngularApi } from "../src/generators/AngularApi";
import test from "ava";
import * as path from "path";
import { validateTypes } from "./common";
import { swaggerParseAndConvert } from "../src/utils";

const dstPath = path.join(__dirname, `../test-generated/api-test-001/`);

let api: Api;
test.cb.serial("parse swagger", (t) => {
  swaggerParseAndConvert(
    path.join(__dirname, "..", "..", "test", "swaggers", "api-test-001.yaml"),
    (openApi3) => {
      api = Api.parseOpenApi(
        "api-test-001",
        dstPath,
        openApi3
      );

      t.end();
  });
});

test.cb.serial("check methods", (t) => {
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

test.cb.serial("check models", (t) => {
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

test.cb.serial("check models/methods", (t) => {
  t.deepEqual(api.models.ParametersDto.type.toTypeScriptType(), "ParametersDto", "typescript type ok");
  t.deepEqual(
    api.methods.createStrategyRest.parameters.map((x) => x.type.toTypeScriptType()),
    ["string", "string"],
    "typescript type ok",
  );

  console.log(api.methods.initStrategyRest.parameters[0]);

  t.deepEqual(
    api.methods.initStrategyRest.parameters.map((x) => x.type.toTypeScriptType()),
    ["string"],
    "typescript type ok",
  );

  t.deepEqual(
    api.methods.initStrategyRest.body.type.toTypeScriptType(),
    "InitiParametersDto",
    "typescript type ok",
  );

  t.deepEqual(
    api.models.OrderMonitoring.extends, "#/components/schemas/MonitoringDto", "type extends",
  );

  t.deepEqual(
    Object.keys(api.models.OrderMonitoring.type.properties),
    ["type", "quantity", "monitoringType"], "type extends parsed ok",
  );

  t.end();
});

test.cb.serial("generate angular 5 api", (t) => {
  const config = new Config(
    dstPath,
    api,
    true,
    false,
    true
  );
  new AngularApi(config);
  t.end();
});
