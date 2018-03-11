"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Type_1 = require("../Type");
const path = require("path");
const _ = require("lodash");
const CommonGenerator = require("./CommonGenerator");
const TypescriptFile_1 = require("../TypescriptFile");
const mkdirp = require("mkdirp").sync;
function camelcase(str) {
    return str
        .replace(/\[.*\]/g, "")
        .toLowerCase()
        .replace(/[_.\- ]+(\w|$)/g, (m, p1) => p1.toUpperCase());
}
class Angular5FormTemplate {
    constructor(api) {
        this.api = api;
        this.indexes = [];
        this.htmlZones = [
            "extra"
        ];
        this.wrapIn = `<div class="row"><div class="col-12">`;
        this.wrapOut = `</div></div>`;
    }
    generate(modelName, dstFile) {
        this.api.sort();
        const model = this.api.models[modelName];
        if (!model) {
            throw new Error(`model not found: ${modelName}`);
        }
        const htmlPath = dstFile + ".html";
        const htmlFilename = path.basename(htmlPath);
        const tsPath = dstFile + ".ts";
        const ts = new TypescriptFile_1.TypescriptFile();
        ts.addImport(model.name, model.filename);
        ts.body = [`
import { Component, Input } from "@angular/core";

//<custom-imports>
//</custom-imports>

@Component({
  selector: "${model.namePlural}-form",
  templateUrl: "./${htmlFilename}"
})`];
        ts.klass = {
            name: `${model.name}FormComponent`,
            extends: "Base",
            implements: null,
            declarations: [
                `@Input() entity: ${model.name}`
            ],
            methods: [`
  constructor(
    injector: Injector,
    activatedRoute: ActivatedRoute,
  ) {
    super(injector, activatedRoute);
  }
//<custom-declarations>
//</custom-declarations>`
            ]
        };
        const html = this.getTemplateHTML(model, ["entity"], ts);
        CommonGenerator.writeZonedTemplate(htmlPath, {
            tokens: this.htmlZones,
            template: html + "<!--extra-->\n<!--/extra-->"
        });
        ts.klass.methods.push(`
//<custom-methods>
//</custom-methods>
`);
        CommonGenerator.writeZonedTemplate(tsPath, {
            tokens: ["custom-methods", "custom-imports", "custom-declarations"],
            template: ts.toString(tsPath)
        });
    }
    getTemplateHTML(model, path, ts) {
        const t = [];
        _.each(model.type.properties, (property, propertyName) => {
            // console.log(property);
            path.push(propertyName);
            t.push(this.getTemplateHTMLType(property, path, ts));
            path.pop();
        });
        return t.join("\n\n");
    }
    getTemplateHTMLType(type, path, ts) {
        // very unsafe atm...
        if (type.control) {
            return this[type.control[0]](type, path, ts, type.control);
        }
        switch (type.type) {
            case Type_1.Kind.BOOLEAN:
                return this.checkbox(type, path);
            case Type_1.Kind.DATE:
                return this.date(type, path);
            case Type_1.Kind.ENUM:
                return this.enum(type, path);
            case Type_1.Kind.NUMBER:
                return this.number(type, path);
            case Type_1.Kind.STRING:
                if (type.foreignKey) {
                    return this.foreignKey(type, path, ts);
                }
                return this.text(type, path);
            case Type_1.Kind.OBJECT:
                return _.map(type.properties, (property, propertyName) => {
                    path.push(propertyName);
                    const r = this.getTemplateHTMLType(property, path, ts);
                    path.pop();
                    return r;
                }).join("\n\n");
            case Type_1.Kind.REFERENCE:
                const refModel = this.api.getReference(type.referenceModel);
                //if (refModel.type.type == Kind.ENUM) {
                //refModel.type.description = type.description;
                return this.getTemplateHTMLType(refModel.type, path, ts);
            //}
            //return "";
            case Type_1.Kind.ARRAY:
                return this.array(type, path, ts);
            default:
                throw new Error(`control type not handled: ${type.type}`);
        }
    }
    checkbox(t, path) {
        return `
${this.wrapIn}
<bb-check
  id="${path.join("-")}"
  name="${path.join("_")}"
  ${t.required ? 'required="required"' : ''}
  ${t.readOnly ? 'disabled="disabled"' : ''}
  [(ngModel)]="${path.join(".")}">${t.description}</bb-check>
${this.wrapOut}
`;
    }
    date(t, path) {
        return `
${this.wrapIn}
<bb-datepicker
  id="${path.join("-")}"
  name="${path.join("_")}"
  label="${t.description}"
  ${t.required ? 'required="required"' : ''}
  ${t.readOnly ? 'disabled="disabled"' : ''}
  [(ngModel)]="${path.join(".")}"></bb-datepicker>
${this.wrapOut}
`;
    }
    enum(t, path) {
        // TODO: <% if (field.controlHelp) { %> help="<%= field.controlHelp %>" <% } %>
        // class="bordered top-label"
        return `
${this.wrapIn}
<bb-input-container
  label="${t.description}">
  <select
    bb-child
    id="${path.join("-")}"
    name="${path.join("_")}"
    ${t.required ? 'required="required"' : ''}
    ${t.readOnly ? 'disabled="disabled"' : ''}
    [(ngModel)]="${path.join(".")}"
    #${camelcase(path.join("-"))}="ngModel">
    ${t.choices.map((choice) => {
            return `<option value="${choice}">${choice}</option>`;
        })}
    </select>
</bb-input-container>

<bb-errors [model]="${camelcase(path.join("-"))}"></bb-errors>
${this.wrapOut}
`;
    }
    array(t, path, ts) {
        const lastPath = path[path.length - 1];
        const indexName = camelcase(path[path.length - 1] + "-id");
        const ngModel = path.join(".");
        const ccName = camelcase(path.join("-"));
        const addFunction = camelcase("add-" + path.join("-"));
        const removeFunction = camelcase("remove-" + path.join("-"));
        path.pop();
        path.push(`${lastPath}[${indexName}]`);
        this.indexes.push(indexName);
        const children = this.getTemplateHTMLType(t.items, path, ts);
        this.indexes.pop();
        const indexesDeclArgs = this.indexes.length ? this.indexes.join(": number, ") + ": number" : "";
        const indexesArgs = this.indexes.length ? this.indexes.join(", ") : "";
        path.pop();
        path.push(lastPath);
        t.items.getParser("x", ts); // addImports
        ts.klass.methods.push(`
${addFunction}(${indexesDeclArgs}) {
  this.${ngModel}.push(${t.items.isPrimitive() ? t.items.getEmptyValue() : t.items.toTypeScriptType() + ".emptyInstance()"});
}
${removeFunction}(${indexesDeclArgs ? indexesDeclArgs + "," : ""} index: number) {
  this.${ngModel}.splice(index, 1);
}
      `);
        return `
<h3 class="d-flex">
  <span>${t.description} ({{${ngModel}.length || 0}})</span>
  <bb-button class="ml-auto" (click)="${addFunction}(${indexesArgs})">
    <i class="fa fa-plus"></i> Añadir
  </bb-button>
</h3>

<div class="ml-1">
  <div class="d-flex mb-1 p-1"
    *ngFor="let item of ${ngModel}; let ${indexName} = index"
    style="background-color: rgba(0,0,0,0.025); border: 1px solid rgba(0,0,0,0.05)">
    <div class="align-self-start text-center" style="width: 2rem">
    {{${indexName} + 1}}
    </div>
    <div class="pl-1" style="width: 100%; border-left: 4px solid rgba(0,0,0,0.2)">
      <div class="d-flex">
        <bb-button class="ml-auto" type="danger" (click)="${removeFunction}(${indexesArgs ? indexesArgs + "," : ""} ${indexName})">
          <i class="fa fa-trash-o"></i>
        </bb-button>
      </div>
      ${children}
    </div>
  </div>
</div>
`;
    }
    hidden(t, path, ts, args) {
    }
    customZone(t, path, ts, args) {
        this.htmlZones.push(args[1]);
        return `<!--${args[1]}-->\n\n<!--/${args[1]}-->`;
    }
    /**
     * list of checkboxes
     * Generate an input in the component
     */
    checkboxList(t, path, ts, args) {
        const name = path[path.length - 1];
        ts.klass.declarations.push(`@Input()  ${name}: {_id: string, label:string}[]`);
        return `
<bb-static label="${t.description}">
  <div *ngFor="let row of ${name}" style="position: relative; min-height: 2rem;">
    <label class="custom-control ui-checkbox">
      <input class="custom-control-input" type="checkbox" [checklist]="${path.join(".")}" [value]="row._id">
      <span class="custom-control-indicator"></span>
      <span class="custom-control-description">{{row.label}}</span>
    </label>
  </div>
</bb-static>
`;
    }
    foreignKey(t, path, ts) {
        const model = t.api.getReference(t.foreignKey);
        ts.addImport(model.name, model.filename);
        ts.klass.declarations.push(`@Input() ${model.namePlural}: ${model.name}`);
        return `
${this.wrapIn}
<bb-input-container
  label="${t.description}">
  <select
    bb-child
    id="${path.join("-")}"
    name="${path.join("_")}"
    ${t.required ? 'required="required"' : ''}
    ${t.readOnly ? 'disabled="disabled"' : ''}
    [(ngModel)]="${path.join(".")}"
    #${camelcase(path.join("-"))}="ngModel">
    <option [ngValue]="row._id" *ngFor="let row of ${model.namePlural}">{{row.label}}</option>
    </select>
</bb-input-container>

<bb-errors [model]="${camelcase(path.join("-"))}"></bb-errors>
${this.wrapOut}
`;
    }
    text(t, path) {
        // TODO: <% if (field.controlHelp) { %> help="<%= field.controlHelp %>" <% } %>
        // class="bordered top-label"
        return `
${this.wrapIn}
<bb-input-container
  label="${t.description}">
  <input
    bb-child
    id="${path.join("-")}"
    name="${path.join("_")}"
    ${t.required ? 'required="required"' : ''}
    ${t.readOnly ? 'disabled="disabled"' : ''}
    [(ngModel)]="${path.join(".")}"
    #${camelcase(path.join("-"))}="ngModel" />
</bb-input-container>

<bb-errors [model]="${camelcase(path.join("-"))}"></bb-errors>
${this.wrapOut}
`;
    }
    number(t, path) {
        // TODO: <% if (field.controlHelp) { %> help="<%= field.controlHelp %>" <% } %>
        // class="bordered top-label"
        return `
${this.wrapIn}
<bb-input-container
  label="${t.description}">
  <input
    bb-child
    id="${path.join("-")}"
    name="${path.join("_")}"
    type="number"
    ${t.required ? 'required="required"' : ''}
    ${t.readOnly ? 'disabled="disabled"' : ''}
    [(ngModel)]="${path.join(".")}"
    #${camelcase(path.join("-"))}="ngModel" />
</bb-input-container>

<bb-errors [model]="${camelcase(path.join("-"))}"></bb-errors>
${this.wrapOut}
`;
    }
}
exports.Angular5FormTemplate = Angular5FormTemplate;
//# sourceMappingURL=Angular5FormTemplate.js.map