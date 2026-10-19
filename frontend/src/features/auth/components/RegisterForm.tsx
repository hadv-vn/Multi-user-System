'use client';

import Link from 'next/link';

import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { PasswordRuleHint } from '@/components/auth/PasswordRuleHint';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PasswordField } from '@/components/ui/PasswordField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import { useRegisterForm } from '../hooks/use-register-form';

export function RegisterForm() {
  const { values, fieldErrors, bannerError, isSubmitting, updateField, submit } = useRegisterForm();

  return (
    <AuthFormCard
      title="Tạo tài khoản"
      footerSlot={
        <>
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-neon-cyan hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
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

        <TextField
          id="register-email"
          label="Email"
          type="email"
          value={values.email}
          onChange={(value) => updateField('email', value)}
          error={fieldErrors.email}
          disabled={isSubmitting}
          autoComplete="email"
        />

        <div>
          <PasswordField
            id="register-password"
            label="Mật khẩu"
            value={values.password}
            onChange={(value) => updateField('password', value)}
            error={fieldErrors.password}
            disabled={isSubmitting}
            autoComplete="new-password"
          />
          <PasswordRuleHint />
        </div>

        <PasswordField
          id="register-confirm-password"
          label="Xác nhận mật khẩu"
          value={values.confirmPassword}
          onChange={(value) => updateField('confirmPassword', value)}
          error={fieldErrors.confirmPassword}
          disabled={isSubmitting}
          autoComplete="new-password"
        />

        <PrimaryButton type="submit" isLoading={isSubmitting} className="mt-2">
          Đăng ký
        </PrimaryButton>
      </form>
    </AuthFormCard>
  );
}
