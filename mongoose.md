# nema: Mongoose generator

Generate mongoose models and schemas.

## Metadata

### At [Definitions Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#definitionsObject) or [Schemas](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#schemaObject)

#### x-nema-db

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

#### x-nema-fk

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

## Filtering colleccions

To easily filter collection you must match the backend types to the APIs
types. That can be easily done adding this definitions to your API definition
file:

Example using OpenApi 3 (only the fun parts):

```
components:
  schemas:
    Operators:
      type: string
      enum:
        - LIKE
        - EQUALS
        - IN
        - RAW

    Where:
      type: object
      properties:
        value:
          type: object # means any, but can be more specific if you want
        operator:
          $ref: "#/components/schemas/Operators"

    # Where depends on your models, so it's the one thing you need
    # to define
    WhereUser:
      type: object
      properties:
        _id:
          $ref: "#/components/schemas/Where"
        userlogin:
          $ref: "#/components/schemas/Where"

  parameters:
    QueryLimit:
      name: limit
      in: query
      description: Query limit
      schema:
        type: number
    QueryOffset:
      name: offset
      in: query
      description: Query offset
      schema:
        type: number
    QueryPopulate:
      name: populate
      in: query
      description: List of fields to be populated
      schema:
        type: array
        items:
          type: string
    QueryFields:
      name: fields
      in: query
      description: List of fields to be fetch
      schema:
        type: array
        items:
          type: string

paths:
  /users:
    get:
      description: Get users list
      operationId: getUsers
      parameters:
        - $ref: "#/components/parameters/QueryLimit"
        - $ref: "#/components/parameters/QueryOffset"
        - $ref: "#/components/parameters/QueryPopulate"
        - $ref: "#/components/parameters/QueryFields"
        - $ref: "#/components/parameters/WhereUser"

```
