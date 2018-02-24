import { ChangeDetectorRef, Pipe, PipeTransform, OnDestroy, WrappedValue } from "@angular/core";
import { CommonException } from "./CommonException";
import { Subject } from "rxjs/Subject";
import { Subscription } from "rxjs/Subscription";

@Pipe({
  name: "isSuccess",
  pure: false
})
export class IsSuccessPipe implements OnDestroy, PipeTransform {
  success: boolean = false;
  subject: Subject<any> = null;
  subscription: Subscription = null;

  constructor(private _ref: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  transform(value: Subject<any>): any {
    if (!this.subject) {
      if (value instanceof Subject) {
        this.subject = value;
        this.subscription = value.subscribe((response) => {
          this.success = true;
          this._ref.markForCheck();
        }, (error) => {
          this.success = false;
          this._ref.markForCheck();
        });
      }
    } else if (value !== this.subject) {
      this.subscription.unsubscribe();
      this.subject = null;
      this.success = false;
      return this.transform(value);
    }

    return this.success;
  }
}
