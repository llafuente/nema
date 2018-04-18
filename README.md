# nema: Node Express Mongo Angular (Generator)
[![Build Status](https://travis-ci.org/llafuente/nema.svg?branch=master)](https://travis-ci.org/llafuente/nema)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/llafuente/nema/master/LICENSE)

`nema` is a command line generator that target full stack:
It generates API/Templates from Swagger 2.0 YAMLS.

Frontend
* Angular 5 api-client using HttpClient
* Angular 5 forms (template and componet) require: [angular-bootstrap-ui](https://github.com/llafuente/angular-bootstrap-ui)

Backend
* Node server using [express](https://github.com/expressjs/express)
* [mongoose](http://mongoosejs.com/) repositories
* node api-client using request [Planned]


# `nema` Command line Help

```
 _  _  _ _  _
| |(/_| | |(_|1.0.0


  Usage: nema [options]

  Code generation from swagger


  Options:

    -V, --version                    output the version number
    --angular5-api                   TARGET(full project): Generate an Angular 5 Module Api client
    --mongoose                       TARGET(plugin@express): Generate Mongoose Schema, Models & Repositories
    --express                        TARGET(full project): Generate Express app/routes
    --angular5-form-template <path>  TARGET(plugin@angular5-api): Generate an Angular 5 Template from given model
    --override-models                Override all models while agreggating
    --override-methods               Override all methods while agreggating
    --lint                           Lint output (tslint), this may take a while
    --swagger <path>                 Path to swagger yml, repeat to aggregate (default: )
    --file <path>                    Output path for TARGET(file) path
    --dst <path>                     Output path for TARGET(project), default: same as the first swagger
    -h, --help                       output usage information

  At least one swagger file is required
  At least one TARGET is required

  Examples:

    nema --swagger=swagger-file.yml --mongoose --express --dst server/
    nema --swagger=swagger-file.yml --angular5-api --dst angular/app/src/api/
```

## Swagger aggregation

You can aggregate many Swaggers into one unique generation.

`nema` will take global schema configuration from the first file and
add parameters, definitions and paths from each other files.

In the end you will have one unique module with all methods an models.

Be aware of collisions :)


```
nema --swagger=./base-api.yml --swagger=./products-api.yml --angular5-api
```

## Limitations / Changes / Caveats

`nema` has to do some triage, we cannot support all SWAGGER features and also
can't do everything 100% `standard`.

* Every `type` with `type:object` must be declared at definitions (first level).
  everything in `nema` need a name

* Operation Object: `operationId` is required

* `schemes` is required

* Do not support `$ref` to external source files

* `/swagger` path is forbidden it's used by swagger-ui

* A sucess Response (2xx) must be defined and only one
`default` response is considered as 200

* No recursive types

  It will give you compile errors on generated code:
  ```
  error TS2395: Individual declarations in merged declaration 'XXX' must be all exported or all local.
  error TS2440: Import declaration conflicts with local declaration of 'XXX'.
  ```

* `type:string` with `format: date|date-format` are treated the same:
Javascript Date

* `type:number` with `format: int32|int64|float|double` are the same:
Javascript Number (double)

Things that may change in the future:

* Only one body parameter is allowed. This is by design to keep compatibility
with an older generator.


## Zoned templates

`nema` generated files are meant to be committed. And inside some files you
can even work. Like express routes.

Zoned templates are generated files that are safe to edit by you
(our beloved end-user). Zones are delimited with an HTML like comment.

For example:

```html
...
export const app = express();
//<express-configuration>
app.set("mongodb", process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test");

// false to disable
app.set("cors", false);
//</express-configuration>
...
```

Internal zones are marked as `<internal-*>` and should not be edited. This is
used to compose generated files.

## Type: any

If you dont add properties to and object type, will be any in TypeScript.

```
definitions:
  object_with_any:
    type: object
    properties:
      this_is_any:
        type: object
```

# Nema (custom) metadata


## [Schema](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#schema)

```
x-nema:
  angularClientModuleName: XXX
  angularClientNodeModuleName: xxx
  apiName: XXXApi
  frontBasePath: /reverse-proxy/api/v1 # optional
```

## [Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#operationObject)

### x-nema-resolve

Create an [angular 5 resolve see example below](#angular5-resolve)

### x-nema-override

Override endpoint properties, this allow to use other generators without
collisions or aggregate multiple files renaming operationIds...

```
basePath: /books
paths:
  /{productId}:
    get:
      description: get book product
      operationId: getProduct
      x-override-front:
        operationId: getBook
```

The final operation id will be: getBook
*dev note*: getProduct won't be accesible at any target generation.

## [Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#parameterObject)

### x-nema-auto-injected

Some parameter could be injected by a reverse proxy / microgateway,
those are useful for backend,
but you don't want those in your front application.


```
paths:
  /{productId}:
    get:
      description: get book product
      operationId: getProduct
      produces:
        - application/json
      parameters:
        - name: reverse-proxy-ip
          x-nema-auto-injected: true
          in: header
          description: BBVA user code.
          required: true
          type: string
```

## [Definitions Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#definitionsObject)

### x-nema-plural

Set plural used for generating, but default will use
[pluralize](https://www.npmjs.com/package/pluralize)

### x-nema-db

Mark model as a db entity (mongoose treat it as a collection)

```
definitions:
  User:
    x-nema-db: true
    type: object
    required:
      - userlogin
      - password
    properties:
      userlogin:
        type: string
        description: Userlogin
        maxLength: 64
        x-nema-lowercase: true
        x-nema-unique: true
      password:
        type: string
        description: Userlogin
        maxLength: 64
        x-nema-lowercase: true
        x-nema-unique: true
```

## [Schema Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#schemaObject)

### x-nema-control

Force a custom control when generating form templates.

for example: `type: string` will be an input text, if you want a textare use:
`x-nema-control: textarea`

#### x-nema-readonly

Mark type as "cannot-be-created/updated".

In forms is displayed as disabled.

When you do the API implementation you should handle it manually.
<!--
#### x-nema-lowercase

Force lowercase

#### x-nema-unique

Mark the property as unique.
-->
### x-nema-fk

Tell nema your type is a foreignKey (mongoose treat it as a ref)

```
definitions:
  Test:
    type: object
    properties:
      subscribers_user_ids:
        type: array
        description: Usuarios inscritos
        items:
          type: string
          x-nema-fk: "#/definitions/User"
```

# Angular 5 Api client

<a name="angular5-resolve"></a>
## Resolves

`nema` can create resolvers for any API if you left the required information
in the route.


Angular route configuration:

```
  {
    path: "strategy/:strategyId",
    component: RootComponent,
    data: {},
    resolve: {
      strategy: StrategyResolve,
    }
  }
```

Swagger extension:

```
paths:
  /strategy/{strategyId}
    parameters:
      - name: strategyId
        in: path
        description: Strategy identifier
        required: true
        type: string
    get:
      name: getStrategy
      description: Get a single strategy by Id
      x-nema-resolve:
        name: StrategyResolve
        errorURL: /error
        parameters: # map route.snapshot.params with the method parameter name
          strategyId: strategyId

```

## Error handling (Angular 5 Client)

### Global error handling (RestApi.onError)

It's recommended to use a global component, so you don't need to handle
subscriptions.

```ts
import { RestApi } from "./api";
import { Component } from "@angular/core";
import { Subscription } from "rxjs/Subscription";

@Component({
  templateUrl: "./PlanDetails.component.html",
})
class TestComponent implements OnDestroy {
  subscription: Subscription;
  constructor(
    public restApi: RestApi,
  ) {

      this.subscription = this.restApi.onError.subscribe((err: CommonException) => {
        // guard: only once!
        // this may not be needed... if you have a global component
        if ((err as any).handled !== true) {
          (err as any).handled = true;
          //display the error!
          console.log(err.message);
        }
      });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
```

### Local error handling

```
import { RestApi } from "./api";
import { Component } from "@angular/core";
import { Subscription } from "rxjs/Subscription";

@Component({
  templateUrl: "./PlanDetails.component.html",
})
class TestComponent implements OnDestroy {
  testId: number;
  constructor(
    public restApi: RestApi,
  ) {
  }

  test() {
    const x = this.restApi.test(
      this.testId,
      { emitError: false } // handle error locally
    );

    x.subscribe((response) => {
      // sucess
    }, (err: api.CommonException) => {
      // error
    });
  }
}
```

# Develop notes

Notes to develop. Not meant to anybody of you :)

While developing rebuild is necessary everytime, edit `bin/nema.js` and
uncomment the compilation step,
then remove from working copy so it won't be committed

```
git update-index --assume-unchanged bin/nema.js
```


```
# Install mongodb
# run server
"C:\Program Files\MongoDB\Server\3.6\bin\mongod.exe" --dbpath C:\data\db
```
