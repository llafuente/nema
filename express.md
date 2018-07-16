# nema: express generator

Generate and express application or API.

nema generate express into two steps.

Example:

```
node bin\nema.js --swagger=c:\your-project\api.yml --express-app --dst=c:\your-project\server # application
node bin\nema.js --swagger=c:\your-project\api.yml --express-api --dst=c:\your-project\server\src\api # API
```


## express-app

Contains the basic express bootstrap for any application.

Do not contains any specific code about your API.

## express-api

Contains a router with all operations defined.

It also modified express-app security.

The router need to be manualy added to your application.

Edit the zones in the file accordingly: `src/routes.ts`

## Security

For security a middleware is created and will be imported first at
any route that need it.

JWT require to set a secret string at your app: `index.ts` @ `express-configuration`

```
app.set("JWTSecret", "xxx");
```
