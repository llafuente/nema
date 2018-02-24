import { ChangeDetectorRef, Pipe, PipeTransform, OnDestroy, WrappedValue } from "@angular/core";
import { CommonException } from "./CommonException";
import { Subject } from "rxjs/Subject";
import { Subscription } from "rxjs/Subscription";

@Pipe({
  name: "isLoading",
  pure: false
})
export class IsLoadingPipe implements OnDestroy, PipeTransform {
  loading: boolean = false;
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
        this.loading = true;
        this.subject = value;
        this.subscription = value.subscribe((response) => {
          this.loading = false;
          this._ref.markForCheck();
        }, (error) => {
          this.loading = false;
          this._ref.markForCheck();
        });
      }
    } else if (value !== this.subject) {
      this.subscription.unsubscribe();
      this.subject = null;
      this.loading = false;
      return this.transform(value);
    }

    return this.loading;
  }
}
