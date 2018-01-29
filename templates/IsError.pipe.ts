import { Pipe, PipeTransform } from "@angular/core";
import { CommonException } from "./CommonException";


@Pipe({
  name: "isError",
})
export class IsErrorPipe implements PipeTransform {
  constructor() {}

  transform(value: any): any {
    if (value instanceof CommonException) {
      const ce: CommonException = value;
      return ce.error;
    }

    return null;
  }
}
