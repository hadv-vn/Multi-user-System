-- Migration ToDo feature extension — thêm bảng "categories" + cột
-- "category_id" trên "tasks" (docs/Task_Category_ToDo.md mục 4.2).

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(10) NOT NULL DEFAULT '#1E88E5',
    "icon" VARCHAR(8) NOT NULL DEFAULT '📁',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_user_id_idx" ON "categories"("user_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "category_id" UUID;

-- AddForeignKey — SET NULL (không CASCADE/RESTRICT): xóa category không xóa
-- task, không bị chặn xóa — xem docs/Task_Category_ToDo.md mục 2.
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "tasks_category_id_idx" ON "tasks"("category_id");
