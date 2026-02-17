#!/bin/sh
set -e

cd /app

echo "▶ Ensuring dependencies..."
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "  - Installing node modules (first run)..."
  npm ci 2>/dev/null || npm install
fi

echo "▶ Waiting for database..."
until pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-itcrm}" >/dev/null 2>&1
do
  sleep 1
done
echo "Database is ready."

echo "▶ Resetting DB + running migrations + seed (prisma migrate reset --force)..."
npx prisma migrate reset --force

echo "▶ Starting Next.js dev server..."
exec npm run dev -- --hostname 0.0.0.0 --port 3000
