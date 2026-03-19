-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "channels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "space_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "channels_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "phone_numbers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phone" TEXT NOT NULL,
    "space_id" INTEGER NOT NULL,
    "channel_id" INTEGER,
    "activity_days" REAL,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "is_cooled" BOOLEAN NOT NULL DEFAULT false,
    "cooled_at" DATETIME,
    "cool_batch_id" INTEGER,
    "send_count" INTEGER NOT NULL DEFAULT 0,
    "last_sent_at" DATETIME,
    "screened_at" DATETIME,
    "import_batch_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "phone_numbers_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "phone_numbers_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "phone_numbers_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "duplicate_numbers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phone" TEXT NOT NULL,
    "space_id" INTEGER NOT NULL,
    "channel_id" INTEGER,
    "import_batch_id" INTEGER NOT NULL,
    "original_phone_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "duplicate_numbers_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "duplicate_numbers_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "duplicate_numbers_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "file_name" TEXT NOT NULL,
    "space_id" INTEGER NOT NULL,
    "channel_id" INTEGER,
    "data_type" TEXT NOT NULL DEFAULT 'merchant',
    "total" INTEGER NOT NULL DEFAULT 0,
    "new_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "duplicate_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "reverted_at" DATETIME,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_batches_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "import_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "screening_batches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "file_name" TEXT NOT NULL,
    "space_id" INTEGER NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "reverted_at" DATETIME,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "screening_batches_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "screening_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "export_batches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "space_id" INTEGER NOT NULL,
    "filters_json" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "file_path" TEXT,
    "is_cool_export" BOOLEAN NOT NULL DEFAULT true,
    "cool_reverted" BOOLEAN NOT NULL DEFAULT false,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "export_batches_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "export_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "send_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phone_number_id" INTEGER,
    "phone" TEXT NOT NULL,
    "space_id" INTEGER,
    "sent_at" DATETIME NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "send_records_phone_number_id_fkey" FOREIGN KEY ("phone_number_id") REFERENCES "phone_numbers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "send_records_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "send_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "send_import_batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "send_import_batches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "file_name" TEXT NOT NULL,
    "valid_count" INTEGER NOT NULL DEFAULT 0,
    "invalid_count" INTEGER NOT NULL DEFAULT 0,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "send_import_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "copywritings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "copywritings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cross_dedup_batches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "primary_space_id" INTEGER NOT NULL,
    "duplicate_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'scanning',
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cross_dedup_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cross_dedup_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "batch_id" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "primary_space_id" INTEGER NOT NULL,
    "source_space_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT "cross_dedup_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "cross_dedup_batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "data_match_tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "file_name" TEXT NOT NULL,
    "target_space_id" INTEGER,
    "total" INTEGER NOT NULL DEFAULT 0,
    "unique_match" INTEGER NOT NULL DEFAULT 0,
    "dup_match" INTEGER NOT NULL DEFAULT 0,
    "match_rate" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "data_match_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stats_snapshots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "snapshot_type" TEXT NOT NULL,
    "space_id" INTEGER,
    "data_json" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stats_snapshots_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "phone_numbers_space_id_activity_days_idx" ON "phone_numbers"("space_id", "activity_days");

-- CreateIndex
CREATE INDEX "phone_numbers_space_id_is_cooled_idx" ON "phone_numbers"("space_id", "is_cooled");

-- CreateIndex
CREATE INDEX "phone_numbers_space_id_send_count_idx" ON "phone_numbers"("space_id", "send_count");

-- CreateIndex
CREATE INDEX "phone_numbers_phone_idx" ON "phone_numbers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "phone_numbers_phone_space_id_key" ON "phone_numbers"("phone", "space_id");

-- CreateIndex
CREATE INDEX "duplicate_numbers_space_id_idx" ON "duplicate_numbers"("space_id");

-- CreateIndex
CREATE INDEX "duplicate_numbers_phone_idx" ON "duplicate_numbers"("phone");

-- CreateIndex
CREATE INDEX "import_batches_space_id_idx" ON "import_batches"("space_id");

-- CreateIndex
CREATE INDEX "screening_batches_space_id_idx" ON "screening_batches"("space_id");

-- CreateIndex
CREATE INDEX "export_batches_space_id_idx" ON "export_batches"("space_id");

-- CreateIndex
CREATE INDEX "send_records_phone_idx" ON "send_records"("phone");

-- CreateIndex
CREATE INDEX "send_records_space_id_idx" ON "send_records"("space_id");

-- CreateIndex
CREATE INDEX "cross_dedup_records_batch_id_idx" ON "cross_dedup_records"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "stats_snapshots_snapshot_type_space_id_key" ON "stats_snapshots"("snapshot_type", "space_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
