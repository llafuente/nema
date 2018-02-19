import { Api } from "../src/Api";
import { Model } from "../src/Model";
import { Angular5Client } from "../src/generators/Angular5Client";
import { Mongoose } from "../src/generators/Mongoose";
import { Express } from "../src/generators/Express";
import { CSV } from "../src/generators/CSV";
import { TypescriptFile } from "../src/TypescriptFile";
import { ParameterType } from "../src/Parameter";
import test from "ava";
import * as _ from "lodash";

let api: Api;
test.cb.serial("parse swagger file", (t) => {
  api = Api.parseSwaggerFile("./test/pet-store.yaml", false);

  //console.log(JSON.stringify(api.methods.getStrategies, null, 2));

  api.sort();

  t.deepEqual(Object.keys(api.methods), [
    'addPet',
    'addPetPhoto',
    'deletePet',
    'deletePetPhoto',
    'deletePets',
    'findPetByName',
    'findPets',
    'getIndex',
    'getPetPhoto',
    'getPetPhotos',
    'updatePetByName',
  ], "all methods added");
  t.deepEqual(Object.keys(api.models), [
    'PetPhotoDto',
    'PetPhotosDto',
    'addressDto',
    'petDto',
    'veterinarianDto',
  ], "all methods added");

  t.deepEqual(Object.keys(api.enums), [
    'petType',
  ], "all methods added");

  const s = api.methods.deletePetPhoto.getSuccessResponse();
  console.log(s);

  t.is(s.type.type, "void", "deletePetPhoto response is void");
  const ts = new TypescriptFile();
  t.is(s.type.getRandom(ts), "null", "randomize void -> null");
  t.is(ts.imports.length, 0, "no imports needed for void");


  t.is(api.enums.petType.type.type, "enum", "petType is an enum");
  t.deepEqual(api.enums.petType.type.choices, [ "cat", "dog", "bird"], "petType choices");

  t.is(api.methods.deletePets.parameters.length, 11, "deletePets has 11 parameters");
  const petTypeParam = _.find(api.methods.deletePets.parameters, {name: "type"})
  t.not(petTypeParam, null);

  t.is(petTypeParam.type.type, "reference", "petTypeParam.type is a reference");
  const petType = petTypeParam.type.api.getReference(petTypeParam.type.referenceModel) as Model;

  t.is(petType.name, "petType");

  t.is(petTypeParam.type.getRandom(ts), "petType.CAT");
  t.is(petType.type.getRandom(ts), "petType.CAT");

  t.is(petTypeParam.type.getParser("xxx", ts), `[petType.CAT,petType.DOG,petType.BIRD].indexOf(xxx) === -1 ? null : xxx`);


  t.end();
});

test.cb.serial("angular 5 generation", (t) => {
  (new Angular5Client(`./test/pet-store-client/`)).generate(api, true, false);
  t.end();
});

test.cb.serial("express generation", (t) => {
   Mongoose.generate(api, `./test/pet-store-server/`, false, false);
   (new Express(`./test/pet-store-server/`)).generate(api, false, false);
   (new CSV(`./test/pet-store-server/`)).generate(api, true, false);
   t.end();
});
