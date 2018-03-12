"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("../src/Api");
const Angular5Client_1 = require("../src/generators/Angular5Client");
const Mongoose_1 = require("../src/generators/Mongoose");
const Express_1 = require("../src/generators/Express");
const CSV_1 = require("../src/generators/CSV");
const TypescriptFile_1 = require("../src/TypescriptFile");
const ava_1 = require("ava");
const _ = require("lodash");
let api;
ava_1.default.cb.serial("parse swagger file", (t) => {
    api = Api_1.Api.parseSwaggerFile("./test/pet-store.yaml");
    //console.log(JSON.stringify(api.methods.getStrategies, null, 2));
    api.sort();
    t.deepEqual(Object.keys(api.methods), [
        "addPet",
        "addPetPhoto",
        "deletePet",
        "deletePetPhoto",
        "deletePets",
        "findPetByName",
        "findPets",
        "getIndex",
        "getPetPhoto",
        "getPetPhotos",
        "updatePetByName",
    ], "all methods added");
    t.deepEqual(Object.keys(api.models), [], "all methods added");
    t.deepEqual(Object.keys(api.enums), [
        "petType",
    ], "all methods added");
    const s = api.methods.deletePetPhoto.getSuccessResponse();
    console.log(s);
    t.is(s.type.type, "void", "deletePetPhoto response is void");
    const ts = new TypescriptFile_1.TypescriptFile();
    t.is(s.type.getRandom(ts), "null", "randomize void -> null");
    t.is(ts.imports.length, 0, "no imports needed for void");
    t.is(api.enums.petType.type.type, "enum", "petType is an enum");
    t.deepEqual(api.enums.petType.type.choices, ["cat", "dog", "bird"], "petType choices");
    t.is(api.methods.deletePets.parameters.length, 11, "deletePets has 11 parameters");
    const petTypeParam = _.find(api.methods.deletePets.parameters, { name: "type" });
    t.not(petTypeParam, null);
    t.is(petTypeParam.type.type, "reference", "petTypeParam.type is a reference");
    const petType = petTypeParam.type.api.getReference(petTypeParam.type.referenceModel);
    t.is(petType.name, "petType");
    t.is(petTypeParam.type.getRandom(ts), "petType.CAT");
    t.is(petType.type.getRandom(ts), "petType.CAT");
    t.is(petTypeParam.type.getParser("xxx", ts), `[petType.CAT,petType.DOG,petType.BIRD].indexOf(xxx) === -1 ? null : xxx`);
    t.end();
});
ava_1.default.cb.serial("angular 5 generation", (t) => {
    (new Angular5Client_1.Angular5Client(`./test/pet-store-client/`, api)).generate(true, false);
    t.end();
});
ava_1.default.cb.serial("express generation", (t) => {
    (new Express_1.Express(`./test/pet-store-server/`, api)).generate(false, false);
    (new Mongoose_1.Mongoose(`./test/pet-store-server/`, api)).generate(false, false);
    (new CSV_1.CSV(`./test/pet-store-server/`)).generate(api, true, false);
    t.end();
});
//# sourceMappingURL=pet-store.test.js.map