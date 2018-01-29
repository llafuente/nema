import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Subject, Observable } from "rxjs";


export abstract class ApiBase {
  host: string;
  basePath: string;
  scheme: string;
  debug: boolean;
  onError: Subject<any> = new Subject<any>();

  constructor(
    public http: HttpClient,
  ) {}

  setDebug(d: boolean) {
    this.debug = d;
  }

  setScheme(scheme: string) {
    if (this.getValidSchemes().indexOf(scheme) === -1) {
      throw new Error(`Invalid scheme[${scheme}] must be one of: <%= swagger.schemes.join(", ")-%>`);
    }
    this.scheme = scheme;
  }

  setHost(host) {
    this.host = host;
  }

  getFullURL(uri: string) : string {
    return `${this.scheme}://` + `${this.host}/${this.basePath}${uri}`.replace(/\/\//g, "/");
  }

  abstract getValidSchemes(): string[];
}
