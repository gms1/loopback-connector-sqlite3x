
import {Callback, PromiseOrVoid} from 'loopback-datasource-juggler';

function callbackOnNextTick<T>(cb?: Callback<T>, err?: Error, val?: T): void {
  if (cb) {
    process.nextTick(() => {
      cb(err, val);
    });
  }
}

// if callback then call the callback from promise on next-tick
// always return void
export function callbackify<T>(promise: Promise<T>, cb: Callback<T>): void {
  promise.then((val) => callbackOnNextTick(cb, undefined, val))
      .catch((err) => callbackOnNextTick(cb, err));
}

// if callback then call the callback and return void
// otherwise return the promise
export function callbackifyOrPromise<T>(
    promise: Promise<T>, cb?: Callback<any>): PromiseOrVoid {
  if (cb) {
    callbackify(promise, cb);
    return;
  }
  return promise;
}
