'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { PasswordRuleHint } from '@/components/auth/PasswordRuleHint';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PasswordField } from '@/components/ui/PasswordField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatusResultCard } from '@/components/ui/StatusResultCard';
import { useResetPasswordForm } from '../hooks/use-reset-password-form';

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const { values, fieldErrors, bannerError, view, isSubmitting, updateField, submit } =
    useResetPasswordForm(token);

  if (view === 'linkInvalid') {
    return (
      <AuthScreenLayout>
        <StatusResultCard
          icon="warning"
          title="Liên kết đặt lại mật khẩu không còn hiệu lực"
          description="Liên kết đã hết hạn hoặc đã được sử dụng."
          primaryAction={{ label: 'Yêu cầu liên kết mới', onClick: () => router.push('/forgot-password') }}
        />
      </AuthScreenLayout>
    );
  }

  if (view === 'success') {
    return (
      <AuthScreenLayout>
        <StatusResultCard
          icon="success"
          title="Đặt lại mật khẩu thành công"
          description="Đang chuyển đến trang đăng nhập..."
          primaryAction={{ label: 'Đăng nhập ngay', onClick: () => router.push('/login') }}
        />
      </AuthScreenLayout>
    );
  }

  return (
    <AuthFormCard title="Đặt lại mật khẩu">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {bannerError ? (
          <ErrorBanner message={bannerError.message} countdownSeconds={bannerError.countdownSeconds} />
        ) : null}

        <div>
          <PasswordField
            id="reset-password-new"
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
          id="reset-password-confirm"
          label="Xác nhận mật khẩu mới"
          value={values.confirmPassword}
          onChange={(value) => updateField('confirmPassword', value)}
          error={fieldErrors.confirmPassword}
          disabled={isSubmitting}
          autoComplete="new-password"
        />

        <PrimaryButton type="submit" isLoading={isSubmitting} className="mt-2">
          Đặt lại mật khẩu
        </PrimaryButton>
      </form>
    </AuthFormCard>
  );
}
