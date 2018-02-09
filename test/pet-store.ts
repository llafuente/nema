import { Api } from "../src/Api";
import { Angular5Client } from "../src/generators/Angular5Client";
import { Mongoose } from "../src/generators/Mongoose";
import { Express } from "../src/generators/Express";
import { ParameterType } from "../src/Parameter";
import test from "ava";

let api: Api;
test.cb.serial("parse swagger file", (t) => {
  api = Api.parseSwaggerFile("./test/pet-store.yaml");

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

  t.end();
});

test.cb.serial("angular 5 generation", (t) => {
  Angular5Client.generate(api, `./test/pet-store-client/`, false);
  t.end();
});

test.cb.serial("express generation", (t) => {
   Mongoose.generate(api, `./test/pet-store-server/`, false);
   (new Express(`./test/pet-store-server/`)).generate(api, false);
   t.end();
 });
