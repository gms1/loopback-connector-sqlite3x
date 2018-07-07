import * as fsex from 'fs-extra';

export function copyDirSync(fromdir: string, tpdir: string): void {
  fsex.copySync(fromdir, tpdir);
}