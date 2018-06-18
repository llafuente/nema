// DO NOT EDIT THIS FILE

import { Cast } from "../Cast";
import { Random } from "../Random";
export interface IParametersDto {
  parameterName: string;
  mutableAtRuntime: boolean;
  mutableAtStartup: boolean;
  type: string;
  allowedValues: string[];
  dataSourceMode: string;
}
export class ParametersDto implements IParametersDto {
  parameterName: string;
  mutableAtRuntime: boolean;
  mutableAtStartup: boolean;
  type: string;
  allowedValues: string[];
  dataSourceMode: string;
  constructor(
    parameterName: string,
    mutableAtRuntime: boolean,
    mutableAtStartup: boolean,
    type: string,
    allowedValues: string[],
    dataSourceMode: string
  ) {
    this.parameterName = parameterName;
    this.mutableAtRuntime = mutableAtRuntime;
    this.mutableAtStartup = mutableAtStartup;
    this.type = type;
    this.allowedValues = allowedValues;
    this.dataSourceMode = dataSourceMode;
  }

  static parse(json: any): ParametersDto {
    if (json == null) {
      return ParametersDto.emptyInstance();
    }

    return new ParametersDto(
      Cast.string(json.parameterName),
      Cast.boolean(json.mutableAtRuntime),
      Cast.boolean(json.mutableAtStartup),
      Cast.string(json.type),
      (json.allowedValues || []).map(x => Cast.string(x)),
      Cast.string(json.dataSourceMode)
    );
  }

  static randomInstance(): ParametersDto {
    return new ParametersDto(
      Random.string(),
      Random.boolean(),
      Random.boolean(),
      Random.string(),
      [Random.string(), Random.string()],
      Random.string()
    );
  }

  static emptyInstance(): ParametersDto {
    return new ParametersDto(null, null, null, null, [], null);
  }

  getParameterName(): string {
    return this.parameterName;
  }
  setParameterName($value: string) {
    this.parameterName = $value;
  }

  getMutableAtRuntime(): boolean {
    return this.mutableAtRuntime;
  }
  setMutableAtRuntime($value: boolean) {
    this.mutableAtRuntime = $value;
  }

  getMutableAtStartup(): boolean {
    return this.mutableAtStartup;
  }
  setMutableAtStartup($value: boolean) {
    this.mutableAtStartup = $value;
  }

  getType(): string {
    return this.type;
  }
  setType($value: string) {
    this.type = $value;
  }

  getAllowedValues(): string[] {
    return this.allowedValues;
  }
  setAllowedValues($value: string[]) {
    this.allowedValues = $value;
  }

  getDataSourceMode(): string {
    return this.dataSourceMode;
  }
  setDataSourceMode($value: string) {
    this.dataSourceMode = $value;
  }
}
