import { Api } from "../src/Api";
import { Angular5Client } from "../src/generators/Angular5Client";
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

  Angular5Client.generate(api, `./test/pet-store/`, false);
  t.end()
});
