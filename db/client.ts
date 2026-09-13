import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';

types.setTypeParser(20, Number);

export type DatabaseResult<T extends QueryResultRow = QueryResultRow> = {
  results: T[];
  meta: { changes: number };
};

export class PreparedQuery {
  private values: unknown[] = [];

  constructor(
    private readonly database: Database,
    private readonly statement: string,
  ) {}

  bind(...values: unknown[]): PreparedQuery {
    this.values = values;
    return this;
  }

  async first<T extends QueryResultRow = QueryResultRow>(): Promise<T | null> {
    const result = await this.database.execute<T>(this.statement, this.values);
    return result.results[0] ?? null;
  }

  async all<T extends QueryResultRow = QueryResultRow>(): Promise<DatabaseResult<T>> {
    return this.database.execute<T>(this.statement, this.values);
  }

  async run(): Promise<DatabaseResult> {
    return this.database.execute(this.statement, this.values);
  }

  async executeWith(client: PoolClient): Promise<DatabaseResult> {
    return this.database.execute(this.statement, this.values, client);
  }
}

export function toPostgresSql(statement: string): string {
  let parameter = 0;
  return statement
    .replace(/date\('now','-365 days'\)/gi, "to_char(CURRENT_DATE - INTERVAL '365 days', 'YYYY-MM-DD')")
    .replace(/\bmin\(/gi, 'LEAST(')
    .replace(/\bmax\(/gi, 'GREATEST(')
    .replace(/\?/g, () => `$${++parameter}`);
}

export class Database {
  private readonly pool: Pool;

  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured. Add the Railway Postgres connection string.');
    }
    this.pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: false } : undefined,
    });
  }

  prepare(statement: string): PreparedQuery {
    return new PreparedQuery(this, statement);
  }

  driver(): Pool {
    return this.pool;
  }

  async execute<T extends QueryResultRow = QueryResultRow>(statement: string, values: unknown[] = [], client?: PoolClient): Promise<DatabaseResult<T>> {
    const result = await (client ?? this.pool).query<T>(toPostgresSql(statement), values);
    return { results: result.rows, meta: { changes: result.rowCount ?? 0 } };
  }

  async batch(statements: PreparedQuery[]): Promise<DatabaseResult[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const results: DatabaseResult[] = [];
      for (const statement of statements) results.push(await statement.executeWith(client));
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

let database: Database | undefined;

export function getDatabase(): Database {
  database ??= new Database();
  return database;
}

export async function closeDatabase(): Promise<void> {
  await database?.close();
  database = undefined;
}
