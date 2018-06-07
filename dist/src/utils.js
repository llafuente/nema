"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function camelcase(str) {
    return str
        .replace(/\[.*\]/g, "")
        .toLowerCase()
        .replace(/[_.\- ]+(\w|$)/g, (m, p1) => p1.toUpperCase());
}
exports.camelcase = camelcase;
function ksort(obj) {
    const ret = {};
    Object.keys(obj)
        .sort()
        .forEach((k) => {
        ret[k] = obj[k];
    });
    return ret;
}
exports.ksort = ksort;
function uniquePush(arr, str) {
    if (arr.indexOf(str) === -1) {
        arr.push(str);
    }
}
exports.uniquePush = uniquePush;
//# sourceMappingURL=utils.js.map