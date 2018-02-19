# nema: Node Express Mongo Angular (Generator)
[![Build Status](https://travis-ci.org/llafuente/nema.svg?branch=master)](https://travis-ci.org/llafuente/nema)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/llafuente/nema/master/LICENSE)

`nema` is an generator that target:

* server: Node Express [WIP]
* server: Mongoose [WIP]
* client: Node, using request [PLANNED]
* client: Angular 5 HttpClient [DONE]

It generates from Swagger 2.0 YAMLS

`nema` includes some extensions to swagger explained below.

## Help

```
 _  _  _ _  _
| |(/_| | |(_|1.0.0


  Usage: nema [options]

  Code generation from swagger


  Options:

    -V, --version       output the version number
    --angular5-api      TARGET: Generate an Angular 5 Module Api client
    --override-models   Override all models while agreggating
    --override-methods  Override all methods while agreggating
    --swagger [path]    Path to swagger yml, repeat to aggregate (default: )
    -h, --help          output usage information
```

## Command line

```
nema --swagger=./path-yo-file.yml --angular5-api
```

### Aggregation

You can aggregate many Swaggers into one unique generation.

`nema` will take module/generation configuration from the first file only and
basePath, parameters etc. from each file.

In the end you will have one unique module with all methods a models.

Be aware of collisions :)


```
nema --swagger=./path-yo-file.yml --swagger=./path-yo-file2.yml --angular5-api
```

### Limitations / chages

* Every `type` with `type:object` must be declared at definitions (first level).
* `operationId` is required
* `schemes` is required
* do not support `$ref` to external source files
* `/swagger` path is forbidden it's used by swagger-ui
* A sucess Response (2xx) must be defined and only one
* No recursive types

  It will give you compile errors on generated code:
  ```
  error TS2395: Individual declarations in merged declaration 'XXX' must be all exported or all local.
  error TS2440: Import declaration conflicts with local declaration of 'XXX'.
  ```

Things that may change in the future:

* `parameters.name` is a variable name, use `parameter.x-nema-header` for real
header name

### Caveats

#### Type: any

If you dont add properties to and object type, will be any in TypeScript.

```
definitions:
  object_with_any:
    type: object
    properties:
      this_is_any:
        type: object
```

### Nema metadata


#### Global metadata

```
x-nema:
  angularClientModuleName: XXX
  angularClientNodeModuleName: xxx
  apiName: XXXApi
  frontBasePath: /reverse-proxy/api/v1 # optional
```

#### paths[...].x-nema-resolve

Create an [angular 5 resolve see example below](#angular5-resolve)

#### paths[get|post|...]: x-nema-override

Override endpoint properties, this allow to use other generator without
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

#### parameters: x-nema-auto-injected / x-nema-header

Some parameter could be injected by a reverse proxy, those are useful for
backend, but you don't want it in your front application, you
could don't know it

Headers and variable names have different naming requirements:
* `nema` will use name as variable name (so no dashes)
* `nema` will use x-nema-header as the header final name (could have dashes)

```
paths:
  /{productId}:
    get:
      description: get book product
      operationId: getProduct
      produces:
        - application/json
      parameters:
        - name: reverseProxyIp
          x-nema-header: reverse-proxy-ip
          x-nema-auto-injected: true
          in: header
          description: BBVA user code.
          required: true
          type: string
```

#### definitions.model: x-nema-db

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

#### type: x-nema-lowercase

Force lowercase

#### type: x-nema-unique

Mark the property as unique.

#### type: x-nema-fk

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
          x-nema-fk: User
```

### Angular 5 Api client

<a name="angular5-resolve"></a>
#### Resolves

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


## Develop notes

Notes to develop. Not meant to anybody of you :)


```
# Install mongodb
# run server
"C:\Program Files\MongoDB\Server\3.6\bin\mongod.exe" --dbpath C:\data\db
```
