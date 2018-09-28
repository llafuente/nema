import { Api } from "./Api";

export class Config {
  constructor(
    public dstPath: string,
    public api: Api,
    public pretty: boolean = false,
    public lint: boolean = false,
    public deprecated: boolean = false,
  ) {

  }
}
