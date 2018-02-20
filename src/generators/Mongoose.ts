import * as assert from "assert";
import { Api, parseYML } from "../Api";
import { Model } from "../Model";
import { Method } from "../Method";
import { Type } from "../Type";
import { Parameter, ParameterType } from "../Parameter";
import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import { Angular5Client } from "./Angular5Client";
import * as CommonGenerator from "./CommonGenerator";

function mkdirSafe(folder) {
  try {
    fs.mkdirSync(folder);
  } catch (e) {
    if (e.code != "EEXIST") throw e;
  }
}

const mongooseSwagger = parseYML(path.join(__dirname, "..", "..", "..", "mongoose.yml"));

export class Mongoose {
  constructor(
    public dstPath: string,
    public api: Api,
  ) {
    this.api.parseSwaggerDefinitions(mongooseSwagger, true);

    this.addIdToModel();
  }

  addIdToModel() {
    this.api.eachModel((model, modelName) => {
      if (model.isDb) {
        assert(model.type.type == "object");

        // declare _id as  any
        const _id = new Type();
        _id.type = "object";
        const p = model.type.properties;
        model.type.properties = {
          _id
        };

        for (let i in p) {
          model.type.properties[i] = p[i];
        }
      }
    });
  }

  generate(pretty: boolean, lint: boolean) {
    this.api.sort();

    // create generation paths
    mkdirSafe(path.join(this.dstPath));
    mkdirSafe(path.join(this.dstPath, "src"));
    mkdirSafe(path.join(this.dstPath, "src/models")); // raw models
    mkdirSafe(path.join(this.dstPath, "src/mongoose")); // mongoose schema/model
    mkdirSafe(path.join(this.dstPath, "src/repositories")); // insert/update/delete/get/list mongoose models

    // generate all models
    CommonGenerator.models(this.api, this.dstPath);

    this.api.eachModel((model, modelName) => {
      if (model.isDb) {
        this.mongooseModelFile(model, path.join(this.dstPath, `src/mongoose/${modelName}.ts`));
        this.mongooseRepositoryFile(model, path.join(this.dstPath, `src/repositories/${model.mongooseRepository}.ts`));
      }
    });

    CommonGenerator.setZonedTemplate(
      path.join(this.dstPath, "./src/index.ts"),
      "mongoose",
      `
import initMongoose from "./mongoose";
initMongoose(app);
      `
    );

    // copy raw files (those that don't need to be generated)
    CommonGenerator.copyCommonTemplates(this.dstPath);
    fs.copyFileSync(path.join(process.cwd(), "templates", "mongoose", "Errors.ts"), path.join(this.dstPath, "src", "Errors.ts"));
    fs.copyFileSync(path.join(process.cwd(), "templates", "mongoose", "Query.ts"), path.join(this.dstPath, "src", "Query.ts"));

    CommonGenerator.copyZonedTemplate(path.join(process.cwd(), "templates", "mongoose", "mongoose.ts"), path.join(this.dstPath, "src", "mongoose.ts"), ["import-models"])

    if (pretty) {
      CommonGenerator.pretty(this.dstPath);
    }
    // this may take a long time...
    if (lint) {
      CommonGenerator.lint(this.dstPath);
    }
  }

  mongooseModelFile(model: Model, filename: string) {
    fs.writeFileSync(filename, this.mongooseModel(model));
  }

  mongooseRepositoryFile(model: Model, filename: string) {
    fs.writeFileSync(filename, this.mongooseRepository(model));
  }

  packageJSONFile(filename: string) {
    fs.writeFileSync(filename, this.packageJSON());
  }

  mongooseModel(model: Model): string {
    const s = [];
    s.push(`import { ${model.interfaceName} } from "../models/${model.name}";`);
    s.push(`import * as mongoose from "mongoose";`);
    s.push(`
export interface ${model.mongooseInterface} extends ${model.interfaceName}, mongoose.Document {}

export const ${model.mongooseSchema} = new mongoose.Schema(
  {`);

    if (model.extends) {
      model.eachParentProperty((t, name) => {
        s.push(`${name}: ${t.toMongooseType()},`);
      });
    }
    model.eachProperty((t, name) => {
      s.push(`${name}: ${t.toMongooseType()},`);
    });

  s.push(`
  },
  {
    collection: ${JSON.stringify(model.mongooseCollection)},
  },
);

export const ${model.mongooseModel} = mongoose.model<${model.mongooseInterface}>("Role", ${model.mongooseSchema});
`);
    return s.join("\n");
  }

  mongooseRepository(model: Model): string {
    const s = [];
    s.push(`import { ${model.name}, ${model.interfaceName} } from "../models/${model.name}";
import { ${model.mongooseModel}, ${model.mongooseSchema}, ${model.mongooseInterface} } from "../mongoose/${model.name}";
import * as mongoose from "mongoose";
import * as _ from "lodash";
import { NotFound } from "../Errors";
import { Query, Operators, Order, Page, Where } from "../Query";
import { Promise } from "bluebird";

export function readById(_id: mongoose.Schema.Types.ObjectId | string): Promise<${model.mongooseInterface}> {
  return ${model.mongooseModel}.findById(_id)
  .then((entity) => {
    if (!entity) {
      throw new NotFound();
    }

    return entity;
  });
}

export function readByIdNullable(_id: mongoose.Schema.Types.ObjectId | string) {
  return ${model.mongooseModel}.findById(_id)
  .then((entity) => {
    return entity || null;
  });
}

export function deleteById(_id: mongoose.Schema.Types.ObjectId | string) {
  return ${model.mongooseModel}.findByIdAndRemove(_id);
}

export function clone(_id: mongoose.Schema.Types.ObjectId | string) {
  this.read(_id)
  .then((entity) => {
    const c = entity.toJSON();
    c._id = undefined;
    c.id = undefined;

    return ${model.mongooseModel}.create(c);
  });
}

export function updateById(entity: ${model.name}) {
  this.read(entity._id)
  .then((dbEntity) => {
    dbEntity.set(entity);

    return dbEntity.save();
  });
}

export function query(
  q: Query
): Promise<{query: ${model.name}[], count: number}> {
  let query = ${model.mongooseModel}.find({});
  let qCount = ${model.mongooseModel}.find({}).count();

  _.each(q.where, (w: Where, path: string) => {
    // console.log("-- where", path, w);

    switch (w.operator) {
      case Operators.IN:
        const options = ${model.mongooseSchema}.path(path);
        const items = (options as any).options.items;
        // console.log(items);

        // TODO REVIEW it's working for array of ObjectIds... and the rest ?
        if (Array.isArray(w.value)) {
          query = query.where(path).in(w.value);
          qCount = qCount.where(path).in(w.value);
        } else {
          query = query.where(path).in([items.type.prototype.cast(w.value)]);
          qCount = qCount.where(path).in([items.type.prototype.cast(w.value)]);
        }
        break;
      case Operators.LIKE:
        query = query.where(path).regex(w.value);
        qCount = qCount.where(path).regex(w.value);
        break;
      default:
        query = query.where(path).equals(w.value);
        qCount = qCount.where(path).equals(w.value);
        break;
    }
  });

  _.each(q.populate, (path: string) => {
    const options = ${model.mongooseSchema}.path(path);
    if (!options) {
      throw new Error("populate[" + path + "] not found");
    }
    /*
    if (!isPathRestricted(options.options.type)) {
    if (!typeCanBePopulated(options.options.type)) {
      throw new Error("populate[" + s + "] can't be populated");
    }
    */
    query.populate(path);
  });

  if (q.offset) {
    query.skip(q.offset);
  }

  if (q.limit) {
    query.limit(q.limit);
  }

  if (q.fields.length) {
    query.select(q.fields.join(" "));
  }

  // http://mongoosejs.com/docs/api.html#query_Query-sort
  query.sort(_.map((q.sort || []), (s: Order, key: string) => {
    const options = ${model.mongooseSchema}.path(key);
    if (!options) {
      throw new Error("sort[" + key + "] not found");
    }

    return [key, s === Order.ASC ? Order.ASC : Order.DESC];
  }));


  return Promise.join(query, qCount, (result, total) => {
    return {
      result,
      total
    };
  });
}

  `);


    return s.join("\n");
  }

  packageJSON() {
    return JSON.stringify({
      "name": this.api.angularClientNodeModuleName,
      "version": this.api.version,
      "description": this.api.description,
      "author": {
        "name": this.api.authorName,
        "email": this.api.authorEmail,
        "url": this.api.authorURL,
      },
      "peerDependencies": {
        "@angular/core": ">=5.2.0",
        "typescript": "*"
      },
      "main": "./index.ts"
    }, null, 2)

  }
}
