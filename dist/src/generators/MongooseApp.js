"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const CommonGenerator = require("./CommonGenerator");
const utils_1 = require("../utils");
const mkdirp = require("mkdirp").sync;
class MongooseApp {
    constructor(dstPath, api) {
        this.dstPath = dstPath;
        this.api = api;
    }
    generate(pretty, lint) {
        // create generation paths
        mkdirp(path.join(this.dstPath, "src/"));
        mkdirp(path.join(this.dstPath, "test/"));
        const packageJSONFile = path.join(this.dstPath, "package.json");
        try {
            const packageJSON = require(packageJSONFile);
            packageJSON.dependencies["bluebird"] = "3.5.1";
            packageJSON.dependencies["mongoose"] = "5.0.10";
            packageJSON.dependencies["mongoosemask"] = "0.0.6";
            packageJSON.devDependencies["@types/bluebird"] = "3.5.20";
            packageJSON.devDependencies["@types/mongoose"] = "5.0.7";
            packageJSON.devDependencies = utils_1.ksort(packageJSON.devDependencies);
            packageJSON.dependencies = utils_1.ksort(packageJSON.dependencies);
            try {
                fs.writeFileSync(packageJSONFile, JSON.stringify(packageJSON, null, 2));
            }
            catch (e) {
                console.log(`cannot write: ${packageJSONFile}`);
            }
        }
        catch (e) {
            console.log(`cannot read: ${packageJSONFile}`);
        }
        const tsconfigFile = path.join(this.dstPath, "tsconfig.json");
        try {
            const tsconfig = require(tsconfigFile);
            utils_1.uniquePush(tsconfig.compilerOptions.types, "bluebird");
            utils_1.uniquePush(tsconfig.compilerOptions.types, "mongoose");
            try {
                fs.writeFileSync(tsconfigFile, JSON.stringify(tsconfig, null, 2));
            }
            catch (e) {
                console.log(`cannot write: ${tsconfigFile}`);
            }
        }
        catch (e) {
            console.log(`cannot read: ${tsconfigFile}`);
        }
        if (!fs.existsSync(path.join(this.dstPath, "test", "mongoose.connection.test.ts"))) {
            fs.copyFileSync(path.join(this.api.root, "templates", "mongoose", "mongoose.connection.test.ts"), path.join(this.dstPath, "test", "mongoose.connection.test.ts"));
        }
        else {
            console.error("skip /test/mongoose.connection.test.ts");
        }
        const indexFile = path.join(this.dstPath, "./src/index.ts");
        if (!fs.existsSync(indexFile)) {
            throw new Error(`${indexFile} must exists. Execute --express-app before this generator`);
        }
        CommonGenerator.setZonedTemplate(indexFile, "mongoose-initialization", `
import initMongoose from "./mongoose";
initMongoose(app);
      `);
        // TODO do it!
        CommonGenerator.setZonedTemplate(path.join(this.dstPath, "./src/index.ts"), "mongoose-error-handling", `
// ????
      `);
        CommonGenerator.copyZonedTemplate(path.join(this.api.root, "templates", "mongoose", "mongoose.ts"), path.join(this.dstPath, "src", "mongoose.ts"), ["import-models"]);
        if (pretty) {
            CommonGenerator.pretty(this.api, this.dstPath);
        }
        // this may take a long time...
        if (lint) {
            CommonGenerator.lint(this.api, this.dstPath);
        }
    }
}
exports.MongooseApp = MongooseApp;
//# sourceMappingURL=MongooseApp.js.map