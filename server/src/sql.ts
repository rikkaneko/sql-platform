import express, { Request, Response } from 'express';
import multer from 'multer';
import mysql from 'mysql2/promise';
import config from './config.js';
import { MySQLError } from './errors.js';
import stream, { Writable } from 'stream';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { promisify } from 'util';

// Restricted access
const db = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  multipleStatements: true,
});

await db.query('SELECT 1;').catch((e: MySQLError) => {
  console.error(`${e.code} - "${e.message}"`);
  console.error(`Unable to connect to the user database, aborted.`);
  process.exit(1);
});

let available_db: Record<string, string[]> = {};
let cached_table_sample_row: Record<string, object[]> = {};
const QUERY_ROW_LIMIT = 15;

async function gather_db_info() {
  console.log('Reusing caches...');
  if (existsSync('./.cached.available_db.json') && existsSync('./.cached.table_sample_row.json')) {
    available_db = JSON.parse(await fs.readFile('./.cached.available_db.json', 'utf-8')) as Record<string, string[]>;
    cached_table_sample_row = JSON.parse(await fs.readFile('./.cached.table_sample_row.json', 'utf-8')) as Record<
      string,
      object[]
    >;
    return;
  }
  console.log('Gathering database information...');
  const db_list = (
    await db.query(`
    SELECT SCHEMA_NAME
    FROM INFORMATION_SCHEMA.SCHEMATA
    WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys');
  `)
  )[0] as { SCHEMA_NAME: string }[];

  for (const { SCHEMA_NAME } of db_list) {
    const res = (
      await db.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = '${SCHEMA_NAME}';
    `)
    )[0] as { TABLE_NAME: string }[];
    const tables = res.map((v) => v.TABLE_NAME);
    available_db[SCHEMA_NAME] = tables;

    for (const t of tables) {
      const res = (
        await db.query(`
        USE ${SCHEMA_NAME}; 
        SELECT * FROM ${t} LIMIT ${QUERY_ROW_LIMIT};
      `)
      )[0] as object[][];
      cached_table_sample_row[`${SCHEMA_NAME}.${t}`] = res[1];
    }
  }

  console.log('Saving caches...');
  await fs.writeFile('./.cached.available_db.json', JSON.stringify(available_db));
  await fs.writeFile('./.cached.table_sample_row.json', JSON.stringify(cached_table_sample_row));
}

await gather_db_info();

const route = express.Router();
const form = multer();

interface SQLExecParams {
  query: string;
  db: string;
}

route.post('/exec', form.none(), async (req: Request, res: Response) => {
  const body = req.body as SQLExecParams;
  if (body?.query === undefined || body?.db === undefined) {
    res.status(400).json({
      status: 'failed',
      message: `Invalid request.`,
    });
    return;
  }
  try {
    const query = body.query;
    const dbname = body.db;
    console.log(`Recevied SQL query: "${query}"`);

    const result: object[] = [];
    // Stream query result
    const reader = db.pool.query(`USE ${dbname}; ${query};`).stream({});
    const writer = new Writable({
      objectMode: true,
      write(data: object, enc, cb) {
        if (data?.constructor?.name !== 'ResultSetHeader') {
          result.push(data);
          if (result.length >= QUERY_ROW_LIMIT) reader.push(null);
        }
        cb();
      },
    });
    const pipeline = promisify(stream.pipeline);
    await pipeline(reader, writer);

    res.json({
      status: 'success',
      result,
    });
  } catch (err) {
    const e = err as MySQLError;
    console.log(`${e.code} - "${e.message}"`);
    res.json({
      status: 'failed',
      message: e.sqlMessage,
    });
  }
});

route.get('/avilable_db', (req, res) => {
  res.json({
    status: 'success',
    db: available_db,
  });
});

route.get('/table/:db/:name', (req, res) => {
  const table_name = `${req.params.db}.${req.params.name}`;
  if (Object.hasOwn(cached_table_sample_row, table_name)) {
    res.json({
      status: 'success',
      table: table_name,
      rows: cached_table_sample_row[table_name],
    });
  } else
    res.status(404).json({
      status: 'failed',
      message: `Table \`${table_name}\` does not exist.`,
    });
});

export default route;
