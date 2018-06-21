// DO NOT EDIT THIS FILE

import { Cast } from "../Cast";
import { Random } from "../Random";
import { StringStringMap } from "./StringStringMap";
export interface IStrategyDto {
  strategyName: string;
  strategyId: string;
  dateTime: number;
  createdTime: number;
  owner: string;
  parameters: StringStringMap[];
  state: string;
  flowInstrument: string;
  hedgeInstrument: string;
  flowVolume: number;
  hedgeSide: string;
  volume: number;
  remainQty: number;
  averagePrice: number;
  groupId: string;
}
export class StrategyDto implements IStrategyDto {
  strategyName: string;
  strategyId: string;
  dateTime: number;
  createdTime: number;
  owner: string;
  parameters: StringStringMap[];
  state: string;
  flowInstrument: string;
  hedgeInstrument: string;
  flowVolume: number;
  hedgeSide: string;
  volume: number;
  remainQty: number;
  averagePrice: number;
  groupId: string;
  constructor(
    strategyName: string,
    strategyId: string,
    dateTime: number,
    createdTime: number,
    owner: string,
    parameters: StringStringMap[],
    state: string,
    flowInstrument: string,
    hedgeInstrument: string,
    flowVolume: number,
    hedgeSide: string,
    volume: number,
    remainQty: number,
    averagePrice: number,
    groupId: string
  ) {
    this.strategyName = strategyName;
    this.strategyId = strategyId;
    this.dateTime = dateTime;
    this.createdTime = createdTime;
    this.owner = owner;
    this.parameters = parameters;
    this.state = state;
    this.flowInstrument = flowInstrument;
    this.hedgeInstrument = hedgeInstrument;
    this.flowVolume = flowVolume;
    this.hedgeSide = hedgeSide;
    this.volume = volume;
    this.remainQty = remainQty;
    this.averagePrice = averagePrice;
    this.groupId = groupId;
  }

  static parse(json: any): StrategyDto {
    if (json == null) {
      return StrategyDto.emptyInstance();
    }

    return new StrategyDto(
      Cast.string(json.strategyName),
      Cast.string(json.strategyId),
      Cast.number(json.dateTime),
      Cast.number(json.createdTime),
      Cast.string(json.owner),
      (json.parameters || []).map(x => StringStringMap.parse(x)),
      Cast.string(json.state),
      Cast.string(json.flowInstrument),
      Cast.string(json.hedgeInstrument),
      Cast.number(json.flowVolume),
      Cast.string(json.hedgeSide),
      Cast.number(json.volume),
      Cast.number(json.remainQty),
      Cast.number(json.averagePrice),
      Cast.string(json.groupId)
    );
  }

  static randomInstance(): StrategyDto {
    return new StrategyDto(
      Random.string(),
      Random.string(),
      Random.number(),
      Random.number(),
      Random.string(),
      [StringStringMap.randomInstance(), StringStringMap.randomInstance()],
      Random.string(),
      Random.string(),
      Random.string(),
      Random.number(),
      Random.string(),
      Random.number(),
      Random.number(),
      Random.number(),
      Random.string()
    );
  }

  static emptyInstance(): StrategyDto {
    return new StrategyDto(
      null,
      null,
      null,
      null,
      null,
      [],
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    );
  }

  getStrategyName(): string {
    return this.strategyName;
  }
  setStrategyName($value: string) {
    this.strategyName = $value;
  }

  getStrategyId(): string {
    return this.strategyId;
  }
  setStrategyId($value: string) {
    this.strategyId = $value;
  }

  getDateTime(): number {
    return this.dateTime;
  }
  setDateTime($value: number) {
    this.dateTime = $value;
  }

  getCreatedTime(): number {
    return this.createdTime;
  }
  setCreatedTime($value: number) {
    this.createdTime = $value;
  }

  getOwner(): string {
    return this.owner;
  }
  setOwner($value: string) {
    this.owner = $value;
  }

  getParameters(): StringStringMap[] {
    return this.parameters;
  }
  setParameters($value: StringStringMap[]) {
    this.parameters = $value;
  }

  getState(): string {
    return this.state;
  }
  setState($value: string) {
    this.state = $value;
  }

  getFlowInstrument(): string {
    return this.flowInstrument;
  }
  setFlowInstrument($value: string) {
    this.flowInstrument = $value;
  }

  getHedgeInstrument(): string {
    return this.hedgeInstrument;
  }
  setHedgeInstrument($value: string) {
    this.hedgeInstrument = $value;
  }

  getFlowVolume(): number {
    return this.flowVolume;
  }
  setFlowVolume($value: number) {
    this.flowVolume = $value;
  }

  getHedgeSide(): string {
    return this.hedgeSide;
  }
  setHedgeSide($value: string) {
    this.hedgeSide = $value;
  }

  getVolume(): number {
    return this.volume;
  }
  setVolume($value: number) {
    this.volume = $value;
  }

  getRemainQty(): number {
    return this.remainQty;
  }
  setRemainQty($value: number) {
    this.remainQty = $value;
  }

  getAveragePrice(): number {
    return this.averagePrice;
  }
  setAveragePrice($value: number) {
    this.averagePrice = $value;
  }

  getGroupId(): string {
    return this.groupId;
  }
  setGroupId($value: string) {
    this.groupId = $value;
  }
}