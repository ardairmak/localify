import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { CREATE_TABLES_SQL } from './schema';

const DATA_DIR = path.join(os.homedir(), '.localify');
const DB_PATH = path.join(DATA_DIR, 'localify.db');
const COVERS_DIR = path.join(DATA_DIR, 'covers');

// Ensure data directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(COVERS_DIR, { recursive: true });

const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(CREATE_TABLES_SQL);

export { COVERS_DIR, DATA_DIR };
export default db;
