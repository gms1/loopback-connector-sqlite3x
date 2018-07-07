
// NOTE: only importing types from 'loopback-datasource-juggler' => no require
//  => not a runtime dependency
// tslint:disable-next-line no-implicit-dependencies
import {Callback} from 'loopback-datasource-juggler';

export function promisify<T>(
    promise: Promise<T>, cb?: Callback<T>): Promise<T> {
  if (!cb) {
    return promise;
  } else {
    return promise
        .then((val) => {
          cb.call(promise, undefined, val);
          return Promise.resolve(val);
        })
        .catch((err) => {
          cb.call(promise, err);
          return Promise.reject(err);
        });
  }
}
