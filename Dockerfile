FROM node:20-slim

RUN npm install -g pnpm

WORKDIR /app

# Copy dependency files first for cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/
COPY client/package.json client/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN cd server && npx prisma generate

# Build server and client
RUN pnpm build

# Create data directory for SQLite + uploads
RUN mkdir -p /data/uploads

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV DATABASE_URL="file:/data/app.db"
ENV NODE_ENV=production

# Make entrypoint executable
RUN chmod +x start.sh

# Start: setup persistent storage, migrate DB, then run server
CMD ["./start.sh"]
