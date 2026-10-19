'use client';

import { PasswordRuleHint } from '@/components/auth/PasswordRuleHint';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { GlassCard } from '@/components/ui/GlassCard';
import { PasswordField } from '@/components/ui/PasswordField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useChangePasswordForm } from '../hooks/use-change-password-form';

export function ChangePasswordSection() {
  const { values, fieldErrors, bannerError, isSubmitting, updateField, submit } =
    useChangePasswordForm();

  return (
    <GlassCard>
      <h2 className="mb-4 font-heading text-lg font-semibold text-slate-100">Đổi mật khẩu</h2>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {bannerError ? <ErrorBanner message={bannerError} /> : null}

        <PasswordField
          id="change-password-current"
          label="Mật khẩu hiện tại"
          value={values.currentPassword}
          onChange={(value) => updateField('currentPassword', value)}
          error={fieldErrors.currentPassword}
          disabled={isSubmitting}
          autoComplete="current-password"
        />

        <div>
          <PasswordField
            id="change-password-new"
            label="Mật khẩu mới"
            value={values.newPassword}
            onChange={(value) => updateField('newPassword', value)}
            error={fieldErrors.newPassword}
            disabled={isSubmitting}
            autoComplete="new-password"
          />
          <PasswordRuleHint />
        </div>

        <PasswordField
          id="change-password-confirm"
          label="Xác nhận mật khẩu mới"
          value={values.confirmNewPassword}
          onChange={(value) => updateField('confirmNewPassword', value)}
          error={fieldErrors.confirmNewPassword}
          disabled={isSubmitting}
          autoComplete="new-password"
        />

        <PrimaryButton type="submit" isLoading={isSubmitting} className="mt-2 max-w-xs">
          Cập nhật mật khẩu
        </PrimaryButton>
      </form>
    </GlassCard>
  );
}
