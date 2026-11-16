-- Migration ToDo feature extension — thêm cột "priority" vào "tasks"
-- (docs/Task_Priority_ToDo.md mục 3).

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "priority" VARCHAR(10) NOT NULL DEFAULT 'medium';

-- CreateConstraint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_priority_check" CHECK ("priority" IN ('low', 'medium', 'high'));
