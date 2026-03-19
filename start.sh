#!/bin/sh
set -e

# Create persistent directories
mkdir -p /data/uploads

# Symlink uploads into server directory (server code uses path.resolve('uploads'))
ln -sfn /data/uploads /app/server/uploads

# Run database migrations
cd /app/server
npx prisma migrate deploy

# Seed on first run
if [ ! -f /data/.seeded ]; then
  echo "[Init] First run, seeding database..."
  npx tsx src/seed.ts
  touch /data/.seeded
  echo "[Init] Seed completed: admin / admin123"
fi

# Start server from server/ directory
# This makes path.resolve('../client/dist') → /app/client/dist ✓
# and path.resolve('uploads') → /app/server/uploads ✓
exec node dist/index.js
