-- Migration ToDo feature extension — thêm "sort_key" vào "tasks" để hỗ
-- trợ kéo-thả sắp xếp thủ công (docs/Task_Reorder_ToDo.md mục 4.1).
-- Backfill giữ đúng thứ tự "created_at desc" hiện tại ngay sau migrate.

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "sort_key" DOUBLE PRECISION;

-- Backfill: sort_key tăng dần theo đúng thứ tự created_at desc hiện tại,
-- nhân 1000 để chừa khoảng trống lớn cho các lần chèn/kéo-thả sau này.
UPDATE "tasks" AS t
SET "sort_key" = ranked.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "user_id" ORDER BY "created_at" DESC
  ) * 1000 AS rn
  FROM "tasks"
) AS ranked
WHERE t."id" = ranked."id";

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "sort_key" SET NOT NULL;

-- CreateIndex
CREATE INDEX "tasks_user_id_sort_key_idx" ON "tasks"("user_id", "sort_key");
