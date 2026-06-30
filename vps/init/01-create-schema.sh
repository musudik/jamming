#!/bin/sh
# Runs only on the FIRST initialization of an empty data directory.
# Creates the application schema named by POSTGRES_SCHEMA.
set -e

SCHEMA="${POSTGRES_SCHEMA:-public}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE SCHEMA IF NOT EXISTS "${SCHEMA}" AUTHORIZATION "${POSTGRES_USER}";
  -- Make the new schema the default for this user so tooling finds it first.
  ALTER ROLE "${POSTGRES_USER}" SET search_path TO "${SCHEMA}", public;
EOSQL

echo "Schema '${SCHEMA}' is ready."
