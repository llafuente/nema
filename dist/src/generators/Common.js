"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = require("../Api");
const CommonGenerator_1 = require("./CommonGenerator");
const path = require("path");
const CommonGenerator = require("./CommonGenerator");
const mongooseSwagger = Api_1.parseYML(path.join(__dirname, "..", "..", "..", "common.yml"));
class Common {
    constructor(dstPath, api) {
        this.dstPath = dstPath;
        this.api = api;
        this.api.parseSwaggerDefinitions(mongooseSwagger, true);
    }
    generate(pretty, lint) {
        this.api.sort();
        // create generation paths
        CommonGenerator_1.mkdirSafe(path.join(this.dstPath));
        CommonGenerator_1.mkdirSafe(path.join(this.dstPath, "src"));
        CommonGenerator_1.mkdirSafe(path.join(this.dstPath, "src/models")); // raw models
        CommonGenerator.models(this.api, this.dstPath);
    }
}
exports.Common = Common;
//# sourceMappingURL=Common.js.map