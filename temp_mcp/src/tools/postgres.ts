import { z } from "zod";
import pg from "pg";

export const postgresToolName = "postgres";
export const postgresToolDescription = "Access and manage PostgreSQL databases";

export const PostgresToolSchema = z.object({
  action: z.enum(["query", "schema"]).describe("Action to perform"),
  sql: z.string().optional().describe("SQL query to execute"),
  table: z.string().optional().describe("Table name for schema information")
});

interface ColumnInfo {
  column_name: string;
  data_type: string;
}

interface TableInfo {
  table_name: string;
}

export async function runPostgresTool(args: z.infer<typeof PostgresToolSchema>) {
  try {
    // Get database URL from command line or environment
    const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("Database URL is required as command line argument or DATABASE_URL environment variable");
    }

    // Create connection pool
    const pool = new pg.Pool({
      connectionString: databaseUrl,
    });

    try {
      const client = await pool.connect();

      try {
        switch (args.action) {
          case "query": {
            if (!args.sql) {
              throw new Error("SQL query is required for query action");
            }

            // Start read-only transaction
            await client.query("BEGIN TRANSACTION READ ONLY");

            try {
              const result = await client.query(args.sql);
              return {
                content: [{
                  type: "text",
                  text: JSON.stringify(result.rows, null, 2)
                }],
                isError: false
              };
            } finally {
              // Always rollback read-only transaction
              await client.query("ROLLBACK").catch((error: Error) => 
                console.warn("Could not roll back transaction:", error)
              );
            }
          }

          case "schema": {
            if (!args.table) {
              // List all tables
              const result = await client.query<TableInfo>(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
              );
              return {
                content: [{
                  type: "text",
                  text: result.rows.map((row: TableInfo) => row.table_name).join('\n')
                }],
                isError: false
              };
            }

            // Get schema for specific table
            const result = await client.query<ColumnInfo>(
              "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
              [args.table]
            );

            return {
              content: [{
                type: "text",
                text: result.rows.map((col: ColumnInfo) => 
                  `${col.column_name}: ${col.data_type}`
                ).join('\n')
              }],
              isError: false
            };
          }

          default:
            throw new Error(`Unknown action: ${args.action}`);
        }
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
} 