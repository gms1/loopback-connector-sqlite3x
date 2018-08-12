// tslint:disable no-require-imports
import sg = require('strong-globalize');
sg.SetRootDir(__dirname);

export * from './sqlite3-settings';
export * from './sqlite3-options';
export * from './sqlite3-juggler-connector';
export * from './sqlite3-crud-connector';

export {AutoUpgrader} from 'sqlite3orm';
