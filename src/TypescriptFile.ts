import * as path from "path";
import * as _ from "lodash";

export interface TypescriptImport {
  list: string[];
  file: string;
}

export class TypescriptFile {
  header: string = "";
  rawImports: string = "";
  imports: TypescriptImport[] = [];

  body: string[] = [];

  klass: {
    name: string,
    extends: string,
    implements: string[],
    declarations: string[],
    methods: string[]
  } = null;

  push(s: string) {
    this.body.push(s);
  }

  addImport(toImport: string, fromFile: string) {
    this.imports.push({
      list: [toImport],
      file: fromFile,
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

    if (this.imports.length) {
      console.log(this.imports);

      this.imports
        .map((imp) => {
          console.log(imp);

          let filepath;

          if (imp.file.indexOf(".") !== -1/* || imp.file.indexOf("/") !== -1*/) {
            filepath = path.posix.relative(path.dirname(filename), imp.file);
          } else {
            filepath = imp.file;
          }

          // it's a TS file?, remove extension and add ./
          if (path.extname(filepath) == ".ts") {
            if (filepath[0] == ".") {
              filepath = `${filepath.substr(0, filepath.length - 3)}`;
            } else {
              filepath = `./${filepath.substr(0, filepath.length - 3)}`;
            }
          }

          // case: * as xxx
          if (imp.list[0][0] == "*") {
            return `import ${imp.list[0]} from ${JSON.stringify(filepath)}`;
          }

          return `import { ${imp.list.join(", ")} } from ${JSON.stringify(filepath)}`;
        })
        .filter((value, index, self) => {
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
