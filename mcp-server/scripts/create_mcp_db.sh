#!/bin/bash

# This script creates the MCP server database and a sample table.

# Set PostgreSQL credentials
export PGUSER=root
export PGPASSWORD=password

DB_NAME="mcp_server_db"

# Check if the database exists
if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "Database '$DB_NAME' already exists."
else
  echo "Creating database '$DB_NAME'..."
  createdb "$DB_NAME"
fi

# Check if the sample table exists and create it if not
TABLE_EXISTS=$(psql -d "$DB_NAME" -tAc "SELECT to_regclass('public.sample_table');")
if [ "$TABLE_EXISTS" = "sample_table" ]; then
  echo "Table 'sample_table' already exists in database '$DB_NAME'."
else
  echo "Creating table 'sample_table' in database '$DB_NAME'..."
  psql -d "$DB_NAME" -c "CREATE TABLE sample_table (id SERIAL PRIMARY KEY, name VARCHAR(255));"
fi

echo "Database setup complete." 