import * as path from "path";

export interface TypescriptImport {
  list: string[],
  file: string
}

export class TypescriptFile {
  header: string = "";
  rawImports: string = "";
  imports: TypescriptImport[] = [];

  body: string[] = [];


  push(s: string) {
    this.body.push(s);
  }

  addImport(toImport: string, fromFile: string) {
    this.imports.push({
      list: [toImport],
      file: fromFile
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
      this.imports.map((imp) => {
        return `import { ${imp.list.join(", ")} } from ${JSON.stringify(path.posix.relative(path.dirname(filename), imp.file))}`;
      }).filter((value, index, self) => {
        return self.indexOf(value) === index;
      })
      .forEach((i) => {
        s.push(i);
      })
    }

    if (this.body.length) {
      this.body.forEach((body) => {
        s.push(body);
      });
    }

    return s.join("\n");

  }
}



