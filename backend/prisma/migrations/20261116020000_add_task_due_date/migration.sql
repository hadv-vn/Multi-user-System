-- Migration ToDo feature extension — thêm cột "due_date" vào "tasks"
-- (docs/Task_DueDate_ToDo.md mục 3.1). Chỉ NGÀY, không giờ -> dùng DATE
-- (không TIMESTAMPTZ) để tránh lệch timezone khi so sánh "quá hạn" ở
-- client theo ngày lịch, không theo mốc thời gian tuyệt đối.

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "due_date" DATE;
