import { Api } from "../Api";
import { Method } from "../Method";
import { Model } from "../Model";
import { Type, Kind } from "../Type";
import { Parameter, ParameterType } from "../Parameter";
import * as fs from "fs";
import * as path from "path";
import * as _ from "lodash";
import * as CommonGenerator from "./CommonGenerator";
import { TypescriptFile } from "../TypescriptFile";
import { camelcase } from "../utils";

const mkdirp = require("mkdirp").sync;

// TODO
function id(path: string[]) {
}

// TODO
function name(path: string[]) {
}



export class Angular5FormTemplate {
  indexes: string[] = [];
  htmlZones: string[] = [
    "extra"
  ];

  constructor(public api: Api) {}

  generate(modelName: string, dstFile: string) {
    this.api.sort();

    const model = this.api.models[modelName];
    if (!model) {
      throw new Error(`model not found: ${modelName}`);
    }

    const htmlPath = dstFile + ".html";
    const htmlFilename = path.basename(htmlPath);
    const tsPath = dstFile + ".ts";

    const ts = new TypescriptFile();
    ts.addAbsoluteImport(model.name, model.filename);
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

//<custom-declarations>
//</custom-declarations>

  constructor(
    injector: Injector,
    activatedRoute: ActivatedRoute,
  ) {
    super(injector, activatedRoute);
  }
`
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
`)

    CommonGenerator.writeZonedTemplate(tsPath, {
      tokens: ["custom-methods", "custom-imports", "custom-declarations"],
      template: ts.toString(tsPath)
    });
  }

  getTemplateHTML(model: Model, modelPath: string[], ts: TypescriptFile) {
    const t = [];
    _.each(model.type.properties, (property, propertyName) => {
      // console.log(property);

      modelPath.push(propertyName);
      t.push(this.getTemplateHTMLType(property, modelPath, ts));

      modelPath.pop();
    });

    return t.join("\n\n");
  }

  getTemplateHTMLType(type: Type, modelPath: string[], ts: TypescriptFile) {
    // very unsafe atm...
    if (type.control) {
      return this[type.control[0]](type, modelPath, ts, type.control);
    }

    switch (type.type) {
      case Kind.BOOLEAN:
        return this.checkbox(type, modelPath);
      case Kind.DATE:
        return this.date(type, modelPath);
      case Kind.ENUM:
        return this.enum(type, modelPath);
      case Kind.NUMBER:
        return this.number(type, modelPath);
      case Kind.ID:
      case Kind.STRING:
        if (type.foreignKey) {
          return this.foreignKey(type, modelPath, ts);
        }
        return this.text(type, modelPath);
      case Kind.OBJECT:
        return _.map(type.properties, (property, propertyName) => {
          modelPath.push(propertyName)
          const r = this.getTemplateHTMLType(property, modelPath, ts);
          modelPath.pop();

          return r;
        }).join("\n\n");
      case Kind.REFERENCE:
        const refModel = this.api.getReference<Model>(type.referenceModel);
        //if (refModel.type.type == Kind.ENUM) {
          //refModel.type.description = type.description;
          return this.getTemplateHTMLType(refModel.type, modelPath, ts);
        //}
        //return "";
      case Kind.ARRAY:
        return this.array(type, modelPath, ts);
      default:
        throw new Error(`control type not handled: ${type.type}`);
    }
  }

  wrapIn = `<div class="row"><div class="col-12">`;
  wrapOut = `</div></div>`;

  getAttributeAsModel(attr, modelPath: string[]) {
    const p = [];
    let evaluate = false;
    for (let i of modelPath) {
      const c = i.indexOf("[");
      if (c !== -1) {
        p.push(`'${i.substring(0, c)}'`);
        p.push(i.substring(c + 1, i.length - 1));
        evaluate = true;
      } else {
        p.push(`'${i}'`);
      }
    }
    if (evaluate) {
      return `[${attr}]="${p.join("+")}"`;
    }
    return `${attr}="${modelPath.join("_")}"`;
  }

  checkbox(t: Type, modelPath: string[]) {
    return `
${this.wrapIn}
<bb-check
  ${this.getAttributeAsModel("id", modelPath)}
  ${this.getAttributeAsModel("name", modelPath)}
  ${t.required ? 'required="required"': ''}
  ${t.readOnly ? 'disabled="disabled"': ''}
  [(ngModel)]="${modelPath.join(".")}">${t.description}</bb-check>
${this.wrapOut}
`;
  }

  date(t: Type, modelPath: string[]) {
    return `
${this.wrapIn}
<bb-datepicker
  ${this.getAttributeAsModel("id", modelPath)}
  ${this.getAttributeAsModel("name", modelPath)}
  label="${t.description}"
  ${t.required ? 'required="required"': ''}
  ${t.readOnly ? 'disabled="disabled"': ''}
  [(ngModel)]="${modelPath.join(".")}"></bb-datepicker>
${this.wrapOut}
`;
  }

  enum(t: Type, modelPath: string[]) {
  // TODO: <% if (field.controlHelp) { %> help="<%= field.controlHelp %>" <% } %>
  // class="bordered top-label"

    return `
${this.wrapIn}
<bb-input-container
  label="${t.description}">
  <select
    bb-child
    ${this.getAttributeAsModel("id", modelPath)}
    ${this.getAttributeAsModel("name", modelPath)}
    ${t.required ? 'required="required"': ''}
    ${t.readOnly ? 'disabled="disabled"': ''}
    [(ngModel)]="${modelPath.join(".")}"
    #${camelcase(modelPath.join("-"))}="ngModel">
    ${t.choices.map((choice) => {
      return `<option value="${choice}">${choice}</option>`;
    })}
    </select>
</bb-input-container>

<bb-errors [model]="${camelcase(modelPath.join("-"))}"></bb-errors>
${this.wrapOut}
`;
  }

  array(t: Type, modelPath: string[], ts: TypescriptFile) {
    const lastPath = modelPath[modelPath.length-1];
    const indexName = camelcase(modelPath[modelPath.length-1] + "-id");
    const ngModel = modelPath.join(".");
    const ccName = camelcase(modelPath.join("-"));
    const addFunction = camelcase("add-" + modelPath.join("-"));
    const removeFunction = camelcase("remove-" + modelPath.join("-"));

    modelPath.pop();
    modelPath.push(`${lastPath}[${indexName}]`)

    this.indexes.push(indexName);
    const children = this.getTemplateHTMLType(t.items, modelPath, ts);
    this.indexes.pop();

    const indexesDeclArgs = this.indexes.length ? this.indexes.join(": number, ") + ": number" : "";
    const indexesArgs = this.indexes.length ? this.indexes.join(", ") : "";

    modelPath.pop();
    modelPath.push(lastPath);



    t.items.getParser("x", ts); // addImports auto :)
    ts.klass.methods.push(`
${addFunction}(${indexesDeclArgs}) {
  this.${ngModel}.push(${t.items.getEmptyValue()});
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

  hidden(t: Type, modelPath: string[], ts: TypescriptFile, args: string[]) {
  }

  customZone(t: Type, modelPath: string[], ts: TypescriptFile, args: string[]) {
    this.htmlZones.push(args[1]);

    return `<!--${args[1]}-->\n\n<!--/${args[1]}-->`
  }
  /**
   * list of checkboxes
   * Generate an input in the component
   */
  checkboxList(t: Type, modelPath: string[], ts: TypescriptFile, args: string[]) {
    const name = modelPath[modelPath.length - 1]
    ts.klass.declarations.push(`@Input()  ${name}: {_id: string, label:string}[]`);

    return `
<bb-static label="${t.description}">
  <div *ngFor="let row of ${name}; let i = index" style="position: relative; min-height: 2rem;">
    <div class="custom-control custom-checkbox"
      ${t.required ? '[class.form-control-required]="true"' : ""}
      [class.has-danger]="model?.errors">
      <input
        [id]="'${name}' + i"
        class="custom-control-input"
        type="checkbox"
        ${t.required ? '[required]="true"' : ""}
        [checklist]="${modelPath.join(".")}"
        [value]="row._id" />
      <label class="custom-control-label" [attr.for]="'${name}' + i">{{row.label}}</label>
      <span class="custom-control-label-indicator"></span>
    </div>
  </div>
</bb-static>
`;

  }

  foreignKey(t: Type, modelPath: string[], ts: TypescriptFile) {
    const model: Model = t.api.getReference(t.foreignKey) as Model;

    ts.addAbsoluteImport(model.name, model.filename);
    ts.klass.declarations.push(`@Input() ${model.namePlural}: ${model.name}`);


    return `
${this.wrapIn}
<bb-input-container
  label="${t.description}">
  <select
    bb-child
    ${this.getAttributeAsModel("id", modelPath)}
    ${this.getAttributeAsModel("name", modelPath)}
    ${t.required ? 'required="required"': ''}
    ${t.readOnly ? 'disabled="disabled"': ''}
    [(ngModel)]="${modelPath.join(".")}"
    #${camelcase(modelPath.join("-"))}="ngModel">
    <option [ngValue]="row._id" *ngFor="let row of ${model.namePlural}">{{row.label}}</option>
    </select>
</bb-input-container>

<bb-errors [model]="${camelcase(modelPath.join("-"))}"></bb-errors>
${this.wrapOut}
`;
  }

  text(t: Type, path: string[]) {
  // TODO: <% if (field.controlHelp) { %> help="<%= field.controlHelp %>" <% } %>
  // class="bordered top-label"

    return `
${this.wrapIn}
<bb-input-container
  label="${t.description}">
  <input
    bb-child
    ${this.getAttributeAsModel("id", path)}
    ${this.getAttributeAsModel("name", path)}
    ${t.required ? 'required="required"': ''}
    ${t.readOnly ? 'disabled="disabled"': ''}
    [(ngModel)]="${path.join(".")}"
    #${camelcase(path.join("-"))}="ngModel" />
</bb-input-container>

<bb-errors [model]="${camelcase(path.join("-"))}"></bb-errors>
${this.wrapOut}
`;
  }

  textarea(t: Type, path: string[]) {
  // TODO: <% if (field.controlHelp) { %> help="<%= field.controlHelp %>" <% } %>
  // class="bordered top-label"

    return `
${this.wrapIn}
<bb-input-container
  label="${t.description}">
  <textarea
    bb-child
    ${this.getAttributeAsModel("id", path)}
    ${this.getAttributeAsModel("name", path)}
    ${t.required ? 'required="required"': ''}
    ${t.readOnly ? 'disabled="disabled"': ''}
    [(ngModel)]="${path.join(".")}"
    #${camelcase(path.join("-"))}="ngModel"></textarea>
</bb-input-container>

<bb-errors [model]="${camelcase(path.join("-"))}"></bb-errors>
${this.wrapOut}
`;
  }

  number(t: Type, path: string[]) {
  // TODO: <% if (field.controlHelp) { %> help="<%= field.controlHelp %>" <% } %>
  // class="bordered top-label"

    return `
${this.wrapIn}
<bb-input-container
  label="${t.description}">
  <input
    bb-child
    ${this.getAttributeAsModel("id", path)}
    ${this.getAttributeAsModel("name", path)}
    type="number"
    ${t.required ? 'required="required"': ''}
    ${t.readOnly ? 'disabled="disabled"': ''}
    [(ngModel)]="${path.join(".")}"
    #${camelcase(path.join("-"))}="ngModel" />
</bb-input-container>

<bb-errors [model]="${camelcase(path.join("-"))}"></bb-errors>
${this.wrapOut}
`;
  }
}
