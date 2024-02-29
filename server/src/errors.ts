export interface MySQLError extends Error {
  code: string;
  errno: number;
  sql: string;
  sqlMessage: string;
}
