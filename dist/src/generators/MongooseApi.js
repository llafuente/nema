"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const CommonGenerator = require("./CommonGenerator");
const ExpressApi_1 = require("./ExpressApi");
const mkdirp = require("mkdirp").sync;
class MongooseApi {
    constructor(config) {
        this.config = config;
        this.expressAppRoot = ExpressApi_1.ExpressApi.getExpressAppRoot(this.config.dstPath);
        // create generation paths
        mkdirp(path.join(this.config.dstPath, "src/models")); // raw models
        mkdirp(path.join(this.config.dstPath, "src/mongoose")); // mongoose schema/model
        mkdirp(path.join(this.config.dstPath, "src/repositories")); // insert/update/delete/get/list mongoose models
        this.config.api.eachModel((model, modelName) => {
            if (model.isDb) {
                this.mongooseModelFile(model, path.join(this.config.dstPath, `src/mongoose/${modelName}.ts`));
                this.mongooseRepositoryFile(model, path.join(this.config.dstPath, `src/repositories/${model.mongooseRepository}.ts`));
            }
        });
        if (!fs.existsSync(path.join(this.config.dstPath, "test", "mongoose.connection.test.ts"))) {
            fs.copyFileSync(path.join(this.config.api.root, "templates", "mongoose", "mongoose.connection.test.ts"), path.join(this.config.dstPath, "test", "mongoose.connection.test.ts"));
        }
        else {
            console.error("skip /test/mongoose.connection.test.ts");
        }
        // copy raw files (those that don't need to be generated)
        CommonGenerator.copyCommonTemplates(this.config.api, this.config.dstPath);
        fs.copyFileSync(path.join(this.config.api.root, "templates", "HttpErrors.ts"), path.join(this.config.dstPath, "src", "HttpErrors.ts"));
        fs.copyFileSync(path.join(this.config.api.root, "templates", "mongoose", "Query.ts"), path.join(this.config.dstPath, "src", "Query.ts"));
    }
    mongooseModelFile(model, filename) {
        CommonGenerator.writeZonedTemplate(filename, this.mongooseModel(model));
    }
    mongooseRepositoryFile(model, filename) {
        fs.writeFileSync(filename, this.mongooseRepository(model));
    }
    packageJSONFile(filename) {
        fs.writeFileSync(filename, this.packageJSON());
    }
    mongooseModel(model) {
        const s = [];
        s.push(`import { ${model.interfaceName} } from "../models/${model.name}";`);
        s.push(`import * as mongoose from "mongoose";`);
        s.push(`
//<custom-imports>
//</custom-imports>

export interface ${model.mongooseInterface} extends ${model.interfaceName}, mongoose.Document {
//<mongoose-instance-methods>
// declare instance methods here
//</mongoose-instance-methods>
}

export interface ${model.mongooseInterface}Model extends mongoose.Model<${model.mongooseInterface}> {
//<mongoose-static-methods>
// declare static methods here
//</mongoose-static-methods>
}

// tslint:disable-next-line:variable-name
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
// here you can update your schema before it became a final model

// If you are going to add a method/static remember to add it to ${model.mongooseInterface} too
// here alone is not enough for you to use it

// examples:
//${model.mongooseInterface}.pre("save", function pre(next) {})
//${model.mongooseInterface}.pre("update", function update(next) {})
//${model.mongooseInterface}.method("doSomething", function(xx, yy): void { })
//${model.mongooseInterface}.static("doSomething", function(xx, yy): void { })

//</mongoose-after-schema>

// tslint:disable-next-line:variable-name
export const ${model.mongooseModel}: ${model.mongooseInterface}Model = mongoose.model<${model.mongooseInterface}, ${model.mongooseInterface}Model>("${model.name}", ${model.mongooseSchema});
`);
        return {
            tokens: ["custom-imports", "mongoose-after-schema", "mongoose-instance-methods", "mongoose-static-methods"],
            template: s.join("\n")
        };
    }
    mongooseRepository(model) {
        // NOTE cannot resolve as linux directly
        const targetDir = path.dirname(model.filename);
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
  let dbQuery = ${model.mongooseModel}.find({});
  let dbQueryCount = ${model.mongooseModel}.find({}).count();

  if (where) {
    _.each(where, (w: Where, path: string) => {
      // console.log("-- where", path, w);

      // empty string? just ignore
      if (w.value === "") {
        return;
      }

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

          dbQuery = dbQuery.where(path).in(w.value);
          dbQueryCount = dbQueryCount.where(path).in(w.value);
          break;
        case Operators.LIKE:
          dbQuery = dbQuery.where(path).regex(w.value);
          dbQueryCount = dbQueryCount.where(path).regex(w.value);
          break;
        case Operators.RAW:
          dbQuery = dbQuery.and(w.value);
          dbQueryCount = dbQueryCount.and(w.value);
          break;
        default:
          dbQuery = dbQuery.where(path).equals(w.value);
          dbQueryCount = dbQueryCount.where(path).equals(w.value);
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
      dbQuery.populate(path);
    });
  }

  if (offset) {
    dbQuery.skip(offset);
  }

  if (limit) {
    dbQuery.limit(limit);
  }

  if (fields && fields.length) {
    dbQuery.select(fields.join(" "));
  }

  if (sort) {
    // http://mongoosejs.com/docs/api.html#query_Query-sort
    dbQuery.sort(_.map((sort || []), (s: Order, key: string) => {
      const options = ${model.mongooseSchema}.path(key);
      if (!options) {
        throw new Error("sort[" + key + "] not found");
      }

      return [key, s === Order.ASC ? Order.ASC : Order.DESC];
    }));
  }


  return new Promise((resolve, reject) => {
    Promise.join(dbQuery, dbQueryCount, (result, total) => {
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
        return JSON.stringify({
            name: this.config.api.angularClientNodeModuleName,
            version: this.config.api.version,
            description: this.config.api.description,
            author: {
                name: this.config.api.authorName,
                email: this.config.api.authorEmail,
                url: this.config.api.authorURL,
            },
            peerDependencies: {
                "@angular/core": ">=5.2.0",
                typescript: "*",
            },
            main: "./index.ts",
        }, null, 2);
    }
}
exports.MongooseApi = MongooseApi;
//# sourceMappingURL=MongooseApi.js.map