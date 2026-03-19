#!/bin/sh
set -e

echo "[Init] === Checking /data volume ==="
echo "[Init] /data contents:"
ls -la /data/ 2>/dev/null || echo "[Init] /data does not exist or is empty"
echo "[Init] Database file check:"
ls -la /data/app.db 2>/dev/null || echo "[Init] /data/app.db does NOT exist"
echo "[Init] Seeded flag check:"
ls -la /data/.seeded 2>/dev/null || echo "[Init] /data/.seeded does NOT exist"
echo "[Init] DATABASE_URL=$DATABASE_URL"

# Create persistent directories
mkdir -p /data/uploads

# Symlink uploads into server directory
ln -sfn /data/uploads /app/server/uploads

# Run database migrations
cd /app/server
echo "[Init] Running prisma migrate deploy..."
npx prisma migrate deploy
echo "[Init] Migration done."

echo "[Init] Database file after migration:"
ls -la /data/app.db 2>/dev/null || echo "[Init] /data/app.db still does NOT exist!"

# Seed on first run
if [ ! -f /data/.seeded ]; then
  echo "[Init] First run, seeding database..."
  npx tsx src/seed.ts
  touch /data/.seeded
  echo "[Init] Seed completed: admin / admin123"
else
  echo "[Init] Already seeded, skipping."
fi

echo "[Init] === Starting server ==="
exec node dist/index.js
