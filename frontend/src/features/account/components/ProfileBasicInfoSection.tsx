'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { TextField } from '@/components/ui/TextField';
import { useSession } from '@/lib/session/use-session';
import { useUpdateProfileForm } from '../hooks/use-update-profile-form';

export function ProfileBasicInfoSection() {
  const { currentUser } = useSession();
  const { nameInput, fieldError, isSubmitting, updateNameInput, submit } = useUpdateProfileForm();

  if (!currentUser) {
    return null;
  }

  return (
    <GlassCard>
      <h2 className="mb-4 font-heading text-lg font-semibold text-slate-100">
        Thông tin cá nhân
      </h2>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextField
          id="profile-email"
          label="Email"
          value={currentUser.email}
          onChange={() => {}}
          disabled
          readOnly
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Vai trò</label>
          <RoleBadge role={currentUser.role} className="px-3 py-1" />
        </div>

        <TextField
          id="profile-name"
          label="Họ tên"
          value={nameInput}
          onChange={updateNameInput}
          error={fieldError ?? undefined}
          disabled={isSubmitting}
          placeholder="Chưa đặt tên hiển thị"
        />

        <PrimaryButton type="submit" isLoading={isSubmitting} className="mt-2 max-w-xs">
          Lưu thay đổi
        </PrimaryButton>
      </form>
    </GlassCard>
  );
}
