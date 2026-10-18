-- Migration bổ sung Phase 2 — thêm admin_action_log (actor-tracking, C-15/T9)
-- Nguồn: docs/design/data-model-multi-user-system.md (mục "admin_action_log"),
-- docs/design/lld-phase2-rbac-account-admin.md.
-- Thuần cộng thêm (additive), KHÔNG sửa migration 20261018000000_init đã áp dụng.

-- CreateTable
CREATE TABLE "admin_action_log" (
    "id" BIGSERIAL NOT NULL,
    "action_type" VARCHAR(30) NOT NULL,
    "target_user_id" UUID NOT NULL,
    "performed_by_admin_id" UUID NOT NULL,
    "previous_value" VARCHAR(50),
    "new_value" VARCHAR(50),
    "performed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_log_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_action_log_action_type_check" CHECK ("action_type" IN ('LOCK', 'UNLOCK', 'ROLE_CHANGE'))
);

-- CreateIndex
CREATE INDEX "admin_action_log_target_user_id_idx" ON "admin_action_log"("target_user_id");

-- CreateIndex
CREATE INDEX "admin_action_log_performed_by_admin_id_idx" ON "admin_action_log"("performed_by_admin_id");

-- CreateIndex
CREATE INDEX "admin_action_log_performed_at_idx" ON "admin_action_log"("performed_at" DESC);

-- AddForeignKey
ALTER TABLE "admin_action_log" ADD CONSTRAINT "admin_action_log_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_log" ADD CONSTRAINT "admin_action_log_performed_by_admin_id_fkey" FOREIGN KEY ("performed_by_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
