
// NOTE: only importing types from 'loopback-datasource-juggler' => no require
//  => not a runtime dependency
// tslint:disable-next-line no-implicit-dependencies
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

// if callback then call the callback
// return rejected promise only if error and no callback given
// otherwise always return resolved promise
export function callbackAndPromise<T>(
    cb?: Callback<T>, err?: Error, val?: T): Promise<T> {
  if (cb) {
    try {
      cb(err, val);
    } catch (err2) {
      return Promise.reject(err2);
    }
    return Promise.resolve(val as T);
  }
  return err ? Promise.reject(err) : Promise.resolve(val as T);
}


// if callback then call the callback and return void
// otherwise return promise
export function callbackOrPromise<T>(
    cb?: Callback<T>, err?: Error, val?: T): PromiseOrVoid {
  if (cb) {
    cb(err, val);
    return;
  }
  return err ? Promise.reject(err) : Promise.resolve(val);
}
