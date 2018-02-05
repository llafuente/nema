"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
class TypescriptFile {
    constructor() {
        this.rawImports = "";
        this.imports = [];
        this.body = [];
    }
    push(s) {
        this.body.push(s);
    }
    addImport(toImport, fromFile) {
        this.imports.push({
            list: [toImport],
            file: fromFile
        });
    }
    toString(filename) {
        const s = [];
        if (this.rawImports) {
            s.push(this.rawImports);
        }
        if (this.imports.length) {
            this.imports.map((imp) => {
                return `import { ${imp.list.join(", ")} } from ${JSON.stringify(path.posix.relative(path.dirname(filename), imp.file))}`;
            }).filter((value, index, self) => {
                return self.indexOf(value) === index;
            })
                .forEach((i) => {
                s.push(i);
            });
        }
        if (this.body.length) {
            this.body.forEach((body) => {
                s.push(body);
            });
        }
        return s.join("\n");
    }
}
exports.TypescriptFile = TypescriptFile;
//# sourceMappingURL=TypescriptFile.js.map