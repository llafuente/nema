"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("../src/Api");
const Angular5Api_1 = require("../src/generators/Angular5Api");
const MongooseApi_1 = require("../src/generators/MongooseApi");
const ExpressApi_1 = require("../src/generators/ExpressApi");
const ExpressCSV_1 = require("../src/generators/ExpressCSV");
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
    t.deepEqual(Object.keys(api.models), [
        "PetPhotoDto",
        "PetPhotosDto",
        "PetPhotosFullDto",
        "addressDto",
        "petDto",
        "veterinarianDto",
    ], "all methods added");
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
    (new Angular5Api_1.Angular5Api(`./test/pet-store-client/`, api)).generate(true, false);
    t.end();
});
ava_1.default.cb.serial("express generation", (t) => {
    (new ExpressApi_1.ExpressApi(`./test/pet-store-server/`, api)).generate(false, false);
    (new MongooseApi_1.MongooseApi(`./test/pet-store-server/`, api)).generate(false, false);
    (new ExpressCSV_1.ExpressCSV(`./test/pet-store-server/`, api)).generate(true, false);
    t.end();
});
//# sourceMappingURL=pet-store.test.js.map