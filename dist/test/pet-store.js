"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("../src/Api");
const Angular5Client_1 = require("../src/generators/Angular5Client");
const Mongoose_1 = require("../src/generators/Mongoose");
const Express_1 = require("../src/generators/Express");
const ava_1 = require("ava");
let api;
ava_1.default.cb.serial("parse swagger file", (t) => {
    api = Api_1.Api.parseSwaggerFile("./test/pet-store.yaml");
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
ava_1.default.cb.serial("angular 5 generation", (t) => {
    Angular5Client_1.Angular5Client.generate(api, `./test/pet-store-client/`, false);
    t.end();
});
ava_1.default.cb.serial("express generation", (t) => {
    Mongoose_1.Mongoose.generate(api, `./test/pet-store-server/`, false);
    (new Express_1.Express(`./test/pet-store-server/`)).generate(api, false);
    t.end();
});
//# sourceMappingURL=pet-store.js.map