import { Api } from "../src/Api";
import { Generator } from "../src/Generator";
import test from "ava";

function isCyclic (obj) {
  var seenObjects = [];

  function detect (obj) {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      if (seenObjects.indexOf(obj) !== -1) {
        return true;
      }
      seenObjects.push(obj);
      for (var key in obj) {
        if (obj.hasOwnProperty(key) && detect(obj[key])) {
          console.log(obj, 'cycle at ' + key);
          process.exit();
          return true;
        }
      }
    }
    return false;
  }

  return detect(obj);
}

let swagger: Api;
test.cb.serial("parse swagger", (t) => {
  swagger = Api.parseSwaggerFile("./test/api-test-001.yaml");

  isCyclic(swagger);

  //console.log(JSON.stringify(swagger, null, 2));

  t.deepEqual(Object.keys(swagger.methods), [
    'createStrategyRest',
    'initStrategyRest',
    'startStrategyRest',
    'pauseStrategyRest',
    'stopStrategyRest',
    'removeStrategyRest',
    'getAvailableStrategiesRest',
    'getActiveStrategiesRest',
    'getActiveStrategiesOfTypeRest',
    'getStrategyRest',
    'panicButtonStrategyRest',
    'panicButtonRest',
    'getDefinedParametersRest',
    'updateParametersRest',
    'getOrdersByStrategyRest',
    'getExecutionsByStrategyRest',
    'getStrategyLogMessagesRest',
    'getMarketStatus',
    'getErrorMessagesRest',
    'createGroup',
    'updateGroup',
    'getGroupById',
    'deleteAuthorizedGroup',
    'getAuthorizedGroups',
    'getAuthorizedGroupsOfUser',
    'getWeightById',
    'deleteWeight',
    'getAllWeights',
    'createWeight',
    'updateWeight',
    'getInstruments',
    'deleteInstrument',
    'createInstrument',
    'updateInstrument',
    'autoHedgerTypeStart',
    'autoHedgerTypeStop',
    'getAutoHedgerStatus',
    'getExecutionsByStrategyAndOrder',
  ], "all methods added");

  t.deepEqual(Object.keys(swagger.models), [
    'StrategyIdDto',
    'StringBooleanMap',
    'StringStringMap',
    'InitiParametersDto',
    'StrategyDto',
    'ParametersDto',
    'MonitoringDto',
    'OrderMonitoring',
    'ExecutionMonitoring',
    'StrategyLogDto',
    'Strategy',
    'AuthorizedGroup',
    'InstrumentDto',
    'Weight',
    'StrategyStatusMessage',
    'ParameterChangedMessage',
  ], "all models added");

  t.deepEqual(swagger.models.ParametersDto.type.toTypeScriptType(), "object", "typescript type ok");
  t.deepEqual(
    swagger.methods.createStrategyRest.parameters.map((x) => x.type.toTypeScriptType()),
    ["string", "string"],
    "typescript type ok"
  );
  t.deepEqual(
    swagger.methods.initStrategyRest.parameters.map((x) => x.type.toTypeScriptType()),
    ["InitiParametersDto", "string"],
    "typescript type ok"
  );

  t.deepEqual(
    swagger.models.OrderMonitoring.extends, "MonitoringDto", "type extends"
  );

  t.deepEqual(
    Object.keys(swagger.models.OrderMonitoring.type.properties),
    ["type", "quantity", "monitoringType"], "type extends parsed ok"
  );

  Generator.generate(swagger, `./test/generated-001/`);

  t.end()
});
