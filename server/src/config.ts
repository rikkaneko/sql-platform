import dotenv from 'dotenv';

dotenv.config();

export default {
  DB_HOST: process.env.DB_HOST ?? 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT ?? '3306'),
  DB_USER: process.env.DB_USER ?? 'root',
  DB_PASSWORD: process.env.DB_PASSWORD ?? process.env.MARIADB_ROOT_PASSWORD ?? '',
  DB_NAME: process.env.DB_NAME!,
  DB_ADMIN_USER: process.env.DB_ADMIN_USER ?? 'root',
  DB_ADMIN_PASSWORD: process.env.DB_ADMIN_PASSWORD ?? process.env.MARIADB_ROOT_PASSWORD ?? '',
  SQL_SCRIPT_DIR: process.env.SQL_SCRIPT_DIR ?? './sql',
};
