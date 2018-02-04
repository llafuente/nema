export enum Operators {
  LIKE = "LIKE",
  EQUALS = "EQUALS",
  IN = "IN",
}

export enum Order {
  ASC = 1,
  DESC = -1,
}

export interface Where {
  operator: Operators;
  value: any;
};

export class Page<T> {
  constructor(public list: T[], public total: number, public offset: number, public limit: number) {}

  static parse<T>(T, obj: any): Page<T> {
    if (obj != null) {
      return new Page<T>(
        obj.list.map((item) => {
          return T.parse(item);
        }),
        obj.total,
        obj.offset,
        obj.limit
      );
    }
    // empty page
    return new Page<T>([], 0, 0, 0);
  }
}

export class Query {
  constructor(
    public limit: number = null,
    public offset: number = null,
    public sort: { [s: string]: Order } = null,
    public where: { [s: string]: Where } = null,
    public populate: string[] = null,
    public fields: string[] = [],
  ) {}

  static parse(obj: any) {
    if (obj != null) {
      if (obj.offset !== null && isNaN(obj.offset)) {
        throw new Error("offset must be a number");
      }

      if (obj.limit !== null && isNaN(obj.limit)) {
        throw new Error("limit must be a number");
      }

      return new Query(
        obj.limit ? parseInt(obj.limit, 10) : 0,
        obj.offset ? parseInt(obj.offset, 10) : 0,
        obj.sort,
        obj.where,
        obj.populate,
        obj.fields || [],
      );
    }
    return new Query();
  }
}
