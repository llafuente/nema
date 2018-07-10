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

For security a middleware is created and a `configure` function.

`configure` should be called at `express-configuration` at `/index.ts`.


example:

```
export const app = express();

//<express-configuration>
// ...
app.set("JWTSecret", "dkjmne398fskj32w98fskjslk");
configure(app);
// ...
//</express-configuration>
```
