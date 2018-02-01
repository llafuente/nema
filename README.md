# nema: Node Express Mongo Angular (Generator)

`nema` is an generator that target:

* server: Node Express Mongo stack [PLANNED]
* client: Node, using request [PLANNED]
* client: Angular 5 HttpClient [DONE]

It generates from Swagger 2.0 YAMLS

Nema includes some extensions explained below.

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
      x-front-resolve:
        name: StrategyResolve
        errorURL: /error
        parameters: # map route.snapshot.params with the method parameter name
          strategyId: strategyId

```

### TODO

* client: Angular 5 HttpClient [DONE]
  * handle required
