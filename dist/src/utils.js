"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function camelcase(str) {
    return str
        .replace(/\[.*\]/g, "")
        .toLowerCase()
        .replace(/[_.\- ]+(\w|$)/g, (m, p1) => p1.toUpperCase());
}
exports.camelcase = camelcase;
//# sourceMappingURL=utils.js.map