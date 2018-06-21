// DO NOT EDIT THIS FILE

import { Cast } from "../Cast";
import { Random } from "../Random";
export interface IStrategyLogDto {
  strategyId: string;
  level: string;
  message: string;
  dateTime: number;
}
export class StrategyLogDto implements IStrategyLogDto {
  strategyId: string;
  level: string;
  message: string;
  dateTime: number;
  constructor(
    strategyId: string,
    level: string,
    message: string,
    dateTime: number
  ) {
    this.strategyId = strategyId;
    this.level = level;
    this.message = message;
    this.dateTime = dateTime;
  }

  static parse(json: any): StrategyLogDto {
    if (json == null) {
      return StrategyLogDto.emptyInstance();
    }

    return new StrategyLogDto(
      Cast.string(json.strategyId),
      Cast.string(json.level),
      Cast.string(json.message),
      Cast.number(json.dateTime)
    );
  }

  static randomInstance(): StrategyLogDto {
    return new StrategyLogDto(
      Random.string(),
      Random.string(),
      Random.string(),
      Random.number()
    );
  }

  static emptyInstance(): StrategyLogDto {
    return new StrategyLogDto(null, null, null, null);
  }

  getStrategyId(): string {
    return this.strategyId;
  }
  setStrategyId($value: string) {
    this.strategyId = $value;
  }

  getLevel(): string {
    return this.level;
  }
  setLevel($value: string) {
    this.level = $value;
  }

  getMessage(): string {
    return this.message;
  }
  setMessage($value: string) {
    this.message = $value;
  }

  getDateTime(): number {
    return this.dateTime;
  }
  setDateTime($value: number) {
    this.dateTime = $value;
  }
}