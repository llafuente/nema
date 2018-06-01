import * as assert from "assert";
import { Api, parseYML } from "../Api";
import { Model } from "../Model";
import { Type, Kind } from "../Type";
import * as fs from "fs";
import * as path from "path";
import * as CommonGenerator from "./CommonGenerator";
import { ModificableTemplate } from "./CommonGenerator";
import { ExpressApi } from "./ExpressApi";

const mkdirp = require("mkdirp").sync;

export class MongooseApi {
  expressAppRoot: string;

  constructor(public dstPath: string, public api: Api) {
  }

  generate(pretty: boolean, lint: boolean) {
    this.api.sort();

    this.expressAppRoot = ExpressApi.getExpressAppRoot(this.dstPath);

    // create generation paths
    mkdirp(path.join(this.dstPath, "src/models")); // raw models
    mkdirp(path.join(this.dstPath, "src/mongoose")); // mongoose schema/model
    mkdirp(path.join(this.dstPath, "src/repositories")); // insert/update/delete/get/list mongoose models

    this.api.eachModel((model, modelName) => {
      if (model.isDb) {
        this.mongooseModelFile(model, path.join(this.dstPath, `src/mongoose/${modelName}.ts`));
        this.mongooseRepositoryFile(model, path.join(this.dstPath, `src/repositories/${model.mongooseRepository}.ts`));
      }
    });

    if (!fs.existsSync(path.join(this.dstPath, "test", "mongoose.connection.test.ts"))) {
      fs.copyFileSync(
        path.join(this.api.root, "templates", "mongoose", "mongoose.connection.test.ts"),
        path.join(this.dstPath, "test", "mongoose.connection.test.ts"),
      );
    } else {
      console.error("skip /test/mongoose.connection.test.ts");
    }

    // copy raw files (those that don't need to be generated)
    CommonGenerator.copyCommonTemplates(this.api, this.dstPath);
    fs.copyFileSync(
      path.join(this.api.root, "templates", "HttpErrors.ts"),
      path.join(this.dstPath, "src", "HttpErrors.ts"),
    );
    fs.copyFileSync(
      path.join(this.api.root, "templates", "mongoose", "Query.ts"),
      path.join(this.dstPath, "src", "Query.ts"),
    );

    if (pretty) {
      CommonGenerator.pretty(this.api, this.dstPath);
    }
    // this may take a long time...
    if (lint) {
      CommonGenerator.lint(this.api, this.dstPath);
    }
  }

  mongooseModelFile(model: Model, filename: string) {
    CommonGenerator.writeZonedTemplate(filename, this.mongooseModel(model));
  }

  mongooseRepositoryFile(model: Model, filename: string) {
    fs.writeFileSync(filename, this.mongooseRepository(model));
  }

  packageJSONFile(filename: string) {
    fs.writeFileSync(filename, this.packageJSON());
  }

  mongooseModel(model: Model): ModificableTemplate {
    const s = [];
    s.push(`import { ${model.interfaceName} } from "../models/${model.name}";`);
    s.push(`import * as mongoose from "mongoose";`);
    s.push(`
export interface ${model.mongooseInterface} extends ${model.interfaceName}, mongoose.Document {}

export const ${model.mongooseSchema} = new mongoose.Schema(
  {`);

    if (model.extends) {
      model.eachParentProperty((t, name) => {
        if (name != "_id") {
          s.push(`${name}: ${t.toMongooseType()},`);
        }
      });
    }
    model.eachProperty((t, name) => {
      if (name != "_id") {
        s.push(`${name}: ${t.toMongooseType()},`);
      }
    });

    s.push(`
  },
  {
    collection: ${JSON.stringify(model.mongooseCollection)},
  },
);

//<mongoose-after-schema>
//</mongoose-after-schema>

export const ${model.mongooseModel} = mongoose.model<${model.mongooseInterface}>("${model.name}", ${model.mongooseSchema});
`);
    return {
      tokens: ["mongoose-after-schema"],
      template: s.join("\n")
    }
  }

  mongooseRepository(model: Model): string {
    // NOTE cannot resolve as linux directly
    const targetDir = path.join(this.dstPath, path.dirname(model.filename));
    const relPath = path.relative(targetDir, path.join(this.expressAppRoot, "src")).replace(/\\/g, "/");

    const s = [];
    s.push(`import { ${model.name}, ${model.interfaceName} } from "../models/${model.name}";
import { ${model.mongooseModel}, ${model.mongooseSchema}, ${model.mongooseInterface} } from "../mongoose/${model.name}";
import * as mongoose from "mongoose";
import * as _ from "lodash";
import { NotFound } from "${path.posix.join(relPath, "HttpErrors")}";
import { Operators } from "../models/Operators";
import { Where } from "../models/Where";
import { Order } from "../Query";
import { Promise } from "bluebird";

export function insert(
  user: ${model.name}
): Promise<${model.mongooseInterface}> {
  return ${model.mongooseModel}.create(user);
}

export function readById(_id: mongoose.Types.ObjectId | string): Promise<${model.mongooseInterface}> {
  return ${model.mongooseModel}.findById(new mongoose.Types.ObjectId(_id.toString()))
  .then((entity) => {
    if (!entity) {
      throw new NotFound();
    }

    return entity;
  });
}

export function readByIdNullable(_id: mongoose.Types.ObjectId | string): Promise<${model.mongooseInterface}> {
  return ${model.mongooseModel}.findById(new mongoose.Types.ObjectId(_id.toString()))
  .then((entity) => {
    return entity || null;
  });
}

export function deleteById(_id: mongoose.Types.ObjectId | string) {
  return ${model.mongooseModel}.findByIdAndRemove(new mongoose.Types.ObjectId(_id.toString()));
}

export function clone(_id: mongoose.Types.ObjectId | string): Promise<${model.mongooseInterface}> {
  return this.read(_id)
  .then((entity) => {
    const c = entity.toJSON();
    c._id = undefined;
    c.id = undefined;

    return ${model.mongooseModel}.create(c);
  });
}

export function updateById(entity: ${model.name}): Promise<${model.mongooseInterface}> {
  return this.read(entity._id)
  .then((dbEntity) => {
    dbEntity.set(entity);

    return dbEntity.save();
  });
}

export function query(
  limit: number,
  offset: number,
  populate: string[],
  fields: string[],
  where: {[name: string]: Where},
  sort: {[name: string]: Order},
): Promise<{result: ${model.mongooseInterface}[], total: number}> {
  let query = ${model.mongooseModel}.find({});
  let qCount = ${model.mongooseModel}.find({}).count();

  if (where) {
    _.each(where, (w: Where, path: string) => {
      // console.log("-- where", path, w);

      switch (w.operator) {
        // guard: avoid emptyInstance() to enter here
        case null:
          return;

        case Operators.IN:
          // leave some debug here, need to catch some edge cases that are still unhandled
          const options = ${model.mongooseSchema}.path(path);
          console.log("options", options);

          let caster = null;
          if (options instanceof mongoose.SchemaTypes.Array) {
            const items = (options as any).options.items;
            caster = items.type ? items.type.prototype.cast : null;
          } else if (options instanceof mongoose.SchemaTypes.ObjectId) {
            caster = mongoose.Types.ObjectId;
          } else {
            caster = (options as any).options.type;
          }
          console.log("caster", caster);

          if (Array.isArray(w.value)) {
            w.value = w.value.map(
              v => (caster ? new caster(v) : v)
            );
          } else {
            w.value = [w.value].map(
              v => (caster ? new caster(v) : v)
            );
          }

          console.log("w.value", w.value);

          query = query.where(path).in(w.value);
          qCount = qCount.where(path).in(w.value);
          break;
        case Operators.LIKE:
          query = query.where(path).regex(w.value);
          qCount = qCount.where(path).regex(w.value);
          break;
        case Operators.RAW:
          query = query.and(w.value);
          qCount = qCount.and(w.value);
          break;
        default:
          query = query.where(path).equals(w.value);
          qCount = qCount.where(path).equals(w.value);
          break;
      }
    });
  }

  if (populate) {
    _.each(populate, (path: string) => {
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
  }

  if (offset) {
    query.skip(offset);
  }

  if (limit) {
    query.limit(limit);
  }

  if (fields && fields.length) {
    query.select(fields.join(" "));
  }

  if (sort) {
    // http://mongoosejs.com/docs/api.html#query_Query-sort
    query.sort(_.map((sort || []), (s: Order, key: string) => {
      const options = ${model.mongooseSchema}.path(key);
      if (!options) {
        throw new Error("sort[" + key + "] not found");
      }

      return [key, s === Order.ASC ? Order.ASC : Order.DESC];
    }));
  }


  return new Promise((resolve, reject) => {
    Promise.join(query, qCount, (result, total) => {
      resolve({
        result,
        total
      });
    })
    .catch(reject);
  })
}


  `);

    return s.join("\n");
  }

  packageJSON() {
    return JSON.stringify(
      {
        name: this.api.angularClientNodeModuleName,
        version: this.api.version,
        description: this.api.description,
        author: {
          name: this.api.authorName,
          email: this.api.authorEmail,
          url: this.api.authorURL,
        },
        peerDependencies: {
          "@angular/core": ">=5.2.0",
          typescript: "*",
        },
        main: "./index.ts",
      },
      null,
      2,
    );
  }
}
