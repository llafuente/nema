"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Config {
    constructor(dstPath, api, pretty = false, lint = false, deprecated = false) {
        this.dstPath = dstPath;
        this.api = api;
        this.pretty = pretty;
        this.lint = lint;
        this.deprecated = deprecated;
    }
}
exports.Config = Config;
//# sourceMappingURL=Config.js.map