"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
function filePathCleanUp(filepath) {
    // it's a TS file?, remove extension and add ./
    if (path.extname(filepath) == ".ts") {
        return `./${filepath.substr(0, filepath.length - 3)}`;
    }
    return filepath;
}
class TypescriptFile {
    constructor() {
        this.header = "";
        this.rawImports = "";
        this.imports = [];
        this.absoluteImports = [];
        this.absoluteExports = [];
        this.body = [];
        this.klass = null;
    }
    push(s) {
        this.body.push(s);
    }
    addAbsoluteImport(toImport, filePath) {
        this.absoluteImports.push({
            list: [toImport],
            file: filePath,
        });
    }
    addAbsoluteExport(toImport, filePath) {
        this.absoluteExports.push({
            list: [toImport],
            file: filePath,
        });
    }
    addImport(toImport, fromFile) {
        this.imports.push({
            list: [toImport],
            file: fromFile,
        });
    }
    uniquePush(s, arr) {
        arr.filter((value, index, self) => {
            return self.indexOf(value) === index;
        })
            .forEach((i) => {
            s.push(i);
        });
    }
    toString(filename) {
        const s = [];
        if (this.header) {
            s.push(this.header);
        }
        if (this.rawImports) {
            s.push(this.rawImports);
        }
        this.uniquePush(s, this.absoluteImports
            .map((imp) => {
            const rel = filePathCleanUp(path.relative(path.dirname(filename), imp.file).replace(/\\/g, "/"));
            if (imp.list[0][0] == "*") {
                return `import ${imp.list[0]} from ${JSON.stringify(rel)};`;
            }
            return `import { ${imp.list.join(", ")} } from ${JSON.stringify(rel)};`;
        }));
        this.uniquePush(s, this.imports
            .map((imp) => {
            const filepath = filePathCleanUp(imp.file);
            // case: * as xxx
            if (imp.list[0][0] == "*") {
                return `import ${imp.list[0]} from ${JSON.stringify(filepath)};`;
            }
            return `import { ${imp.list.join(", ")} } from ${JSON.stringify(filepath)};`;
        }));
        this.uniquePush(s, this.absoluteExports
            .map((imp) => {
            const rel = filePathCleanUp(path.relative(path.dirname(filename), imp.file).replace(/\\/g, "/"));
            if (imp.list[0][0] == "*") {
                return `export ${imp.list[0]} from ${JSON.stringify(rel)};`;
            }
            return `export { ${imp.list.join(", ")} } from ${JSON.stringify(rel)};`;
        }));
        if (this.body.length) {
            this.body.forEach((body) => {
                s.push(body);
            });
        }
        if (this.klass) {
            s.push(`
export class ${this.klass.name}${this.klass.extends ? ` extends ${this.klass.extends}` : ""}${this.klass.implements ? ` implements ${this.klass.implements.join(", ")}` : ""} {
  ${this.klass.declarations.length ? this.klass.declarations.join(";\n  ") + ";" : ""}
  ${this.klass.methods.join("\n  ")}
}
`);
        }
        return s.join("\n");
    }
}
exports.TypescriptFile = TypescriptFile;
//# sourceMappingURL=TypescriptFile.js.map