# nema: express generator

nema generate express into two steps generations.

Example:

```
node bin\nema.js --swagger=c:\your-project\api.yml --express-app --dst=c:\your-project\server
node bin\nema.js --swagger=c:\your-project\api.yml --express-api --dst=c:\your-project\server\src\api
```


## express-app

Contains the basic bootstrap for any application.

Do not contains any specific code about your API.

## express-api

Contains a router will all operations defined.

It also modified express-app security.

The router need to be manualy added to your application.

Edit the zones in the file accordingly: `src/routes.ts`


