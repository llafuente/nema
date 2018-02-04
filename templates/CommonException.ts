/**
 * This class is the common exception to handle this type of errors
 */
export class CommonException {
  /**
   * Public constructor
   * @param status with the status code
   */
  constructor(
    public status   : number,
    public error    : string,
    public message  : string,
    public exception: string,
    public path     : string,
    public timestamp: number|Date,
  ) { }

  static parse(json: any): CommonException {
    return new CommonException(
      json.status,
      json.error,
      json.message,
      json.exception,
      json.path,
      json.timestamp,
    );
  }


  /**
   * @return the object as string
   */
  toString() {
    return JSON.stringify(this, null, 2);
  }
};
