-- Bridge the deployed database from the original auth-only schema to the
-- current Clerk-backed expense schema.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'id'
      AND data_type <> 'integer'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'User_legacy_auth'
    ) THEN
      RAISE EXCEPTION 'Cannot migrate old User table because User_legacy_auth already exists';
    END IF;

    ALTER TABLE "User" RENAME TO "User_legacy_auth";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" SERIAL NOT NULL,
  "clerk_id" TEXT,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "password" TEXT NOT NULL,
  "verification_code" INTEGER NOT NULL,
  "verification_expires" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clerk_id" TEXT;

CREATE TABLE IF NOT EXISTS "Category" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT,
  "color" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Group" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "owner_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RecurringExpense" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "user_id" INTEGER NOT NULL,
  "category_id" INTEGER NOT NULL,
  "group_id" INTEGER,
  "frequency" TEXT NOT NULL,
  "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "end_date" TIMESTAMP(3),
  "next_run" TIMESTAMP(3),
  "last_run" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Expense" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" INTEGER NOT NULL,
  "category_id" INTEGER NOT NULL,
  "group_id" INTEGER,
  "description" TEXT,
  "is_recurring" BOOLEAN NOT NULL DEFAULT false,
  "recurrence" TEXT,
  "recurring_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GroupMember" (
  "id" SERIAL NOT NULL,
  "group_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExpenseSplit" (
  "id" SERIAL NOT NULL,
  "expense_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExpenseSplit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Settlement" (
  "id" SERIAL NOT NULL,
  "group_id" INTEGER NOT NULL,
  "payer_id" INTEGER NOT NULL,
  "receiver_id" INTEGER NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Profile" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "avatar_url" TEXT,
  "avatar_filename" TEXT,
  "avatar_color" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_clerk_id_key" ON "User"("clerk_id");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_email_username_idx" ON "User"("email", "username");

CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");

CREATE INDEX IF NOT EXISTS "Expense_user_id_idx" ON "Expense"("user_id");
CREATE INDEX IF NOT EXISTS "Expense_category_id_idx" ON "Expense"("category_id");
CREATE INDEX IF NOT EXISTS "Expense_group_id_idx" ON "Expense"("group_id");
CREATE INDEX IF NOT EXISTS "Expense_recurring_id_idx" ON "Expense"("recurring_id");
CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");

CREATE INDEX IF NOT EXISTS "RecurringExpense_user_id_idx" ON "RecurringExpense"("user_id");
CREATE INDEX IF NOT EXISTS "RecurringExpense_next_run_idx" ON "RecurringExpense"("next_run");

CREATE INDEX IF NOT EXISTS "Group_owner_id_idx" ON "Group"("owner_id");

CREATE UNIQUE INDEX IF NOT EXISTS "GroupMember_group_id_user_id_key" ON "GroupMember"("group_id", "user_id");

CREATE INDEX IF NOT EXISTS "ExpenseSplit_expense_id_idx" ON "ExpenseSplit"("expense_id");
CREATE INDEX IF NOT EXISTS "ExpenseSplit_user_id_idx" ON "ExpenseSplit"("user_id");

CREATE INDEX IF NOT EXISTS "Settlement_group_id_idx" ON "Settlement"("group_id");
CREATE INDEX IF NOT EXISTS "Settlement_payer_id_idx" ON "Settlement"("payer_id");
CREATE INDEX IF NOT EXISTS "Settlement_receiver_id_idx" ON "Settlement"("receiver_id");

CREATE UNIQUE INDEX IF NOT EXISTS "Profile_user_id_key" ON "Profile"("user_id");
CREATE INDEX IF NOT EXISTS "Profile_user_id_idx" ON "Profile"("user_id");

DO $$
BEGIN
  ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_recurring_id_fkey"
    FOREIGN KEY ("recurring_id") REFERENCES "RecurringExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "RecurringExpense"
    ADD CONSTRAINT "RecurringExpense_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "RecurringExpense"
    ADD CONSTRAINT "RecurringExpense_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "GroupMember"
    ADD CONSTRAINT "GroupMember_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "GroupMember"
    ADD CONSTRAINT "GroupMember_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ExpenseSplit"
    ADD CONSTRAINT "ExpenseSplit_expense_id_fkey"
    FOREIGN KEY ("expense_id") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ExpenseSplit"
    ADD CONSTRAINT "ExpenseSplit_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Settlement"
    ADD CONSTRAINT "Settlement_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Settlement"
    ADD CONSTRAINT "Settlement_payer_id_fkey"
    FOREIGN KEY ("payer_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Settlement"
    ADD CONSTRAINT "Settlement_receiver_id_fkey"
    FOREIGN KEY ("receiver_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Profile"
    ADD CONSTRAINT "Profile_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
