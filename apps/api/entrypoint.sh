#!/bin/sh
set -e

echo "Running database migrations..."
node apps/api/dist/db/migrate.js

echo "Seeding database..."
node apps/api/dist/db/seed.js

echo "Starting TaskFlow API..."
exec node apps/api/dist/index.js
