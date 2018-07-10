# nema: Angular generator

# security

Angular generator don't generate any security related code.


You could hook HttpClient with the following code at your module definition:

```
import { JwtModule } from "@auth0/angular-jwt";

@NgModule({
  imports: [
    // ...
    JwtModule.forRoot({
      config: {
        tokenGetter: () => {
          // NOTE jwt token returned by server need to be stored here
          return localStorage.getItem("access_token");
        },
        whitelistedDomains: [domain, "localhost:8080"],
      },
    }),
    // ...
  ],
})
```
