export interface Sqlite3AllSettings {
  file: string;
  mode: number;
  debug: boolean;
}

export type Sqlite3Settings = Partial<Sqlite3AllSettings>;
