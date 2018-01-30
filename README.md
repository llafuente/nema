# nema: Node Express Mongo Angular

`nema` is an api server/client from a swagger definition, RAML is planned using,
a converter

It also has a extended definition to create CRUD controllers.

## Generators

* Angular Client [WIP]
* Node Express [TODO]
* Node Mongo CRUD [TODO]
* Angular CRUD [TODO]

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

`nema` will take config from the first file, and add methods and models
from the rest.

```
nema --swagger=./path-yo-file.yml --swagger=./path-yo-file2.yml --angular5-api
```

### Angular 5 Api client

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
  /xxx
    get:
      x-front-resolve:
        name: StrategyResolve
        errorURL: /error
        parameters: # map route.snapshot.params with the method parameter name
          strategyId: strategyId

```
