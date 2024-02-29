import mysql from 'mysql2/promise';
import config from './config.js';
import { MySQLError } from './errors.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Admin access
const db = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_ADMIN_USER,
  password: config.DB_ADMIN_PASSWORD,
  multipleStatements: true,
});

await db.query('SELECT 1;').catch((e: MySQLError) => {
  console.error(`${e.code} - "${e.message}"`);
  console.error(`Unable to connect to the admin database, aborted.`);
  process.exit(1);
});

async function execute_sql_file(path: string): Promise<MySQLError | undefined> {
  if (existsSync(path)) {
    const sql = await fs.readFile(path, 'utf8');
    try {
      console.log(`Processing \`${path}\``);
      await db.query(sql);
    } catch (err) {
      const e = err as MySQLError;
      return e;
    }
  }
}

async function find_execute_sql_file(dir: string): Promise<number> {
  const files = await fs.readdir(dir);
  let processed_n = 0;
  for (const file of files.sort()) {
    const filepath = path.join(dir, file);
    const stats = await fs.stat(filepath);
    if (stats.isFile()) {
      const res = await execute_sql_file(filepath);
      if (res) console.log(`Fail to execute \`${filepath}\`: ${res.code}`);
      else processed_n++;
    } else if (stats.isDirectory()) {
      const check_file = path.join(filepath, '.checked');
      if (existsSync(check_file)) continue;
      processed_n += await find_execute_sql_file(filepath);
      await fs.writeFile(check_file, '');
    }
  }
  return processed_n;
}

export async function init_db() {
  // Load user script
  const res = await execute_sql_file('user.sql');
  if (res) console.log(`Fail to execute \`user.sql\`: ${res.code}`);
  const n = await find_execute_sql_file(config.SQL_SCRIPT_DIR);
  console.log(`Processed ${n} sql files.`);
  console.log('DB Setup done.');
}
