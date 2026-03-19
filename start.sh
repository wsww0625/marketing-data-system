#!/bin/sh
set -e

# Symlink uploads to persistent volume
ln -sfn /data/uploads /app/uploads

# Run database migrations
cd /app/server
npx prisma migrate deploy

# Seed on first run (if no users exist)
if [ ! -f /data/.seeded ]; then
  echo "[Init] First run detected, seeding database..."
  npx tsx src/seed.ts
  touch /data/.seeded
  echo "[Init] Seed completed: admin / admin123"
fi

# Start server
cd /app
exec node server/dist/index.js
