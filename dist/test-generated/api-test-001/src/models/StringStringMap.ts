// DO NOT EDIT THIS FILE

import { Cast } from "../Cast";
import { Random } from "../Random";
export interface IStringStringMap {
  key: string;
  value: string;
}
export class StringStringMap implements IStringStringMap {
  key: string;
  value: string;
  constructor(key: string, value: string) {
    this.key = key;
    this.value = value;
  }

  static parse(json: any): StringStringMap {
    if (json == null) {
      return StringStringMap.emptyInstance();
    }

    return new StringStringMap(Cast.string(json.key), Cast.string(json.value));
  }

  static randomInstance(): StringStringMap {
    return new StringStringMap(Random.string(), Random.string());
  }

  static emptyInstance(): StringStringMap {
    return new StringStringMap(null, null);
  }

  getKey(): string {
    return this.key;
  }
  setKey($value: string) {
    this.key = $value;
  }

  getValue(): string {
    return this.value;
  }
  setValue($value: string) {
    this.value = $value;
  }
}
