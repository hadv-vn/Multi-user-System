'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { CountdownText } from '@/components/ui/CountdownText';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PasswordField } from '@/components/ui/PasswordField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import { useLoginForm } from '../hooks/use-login-form';
import { useResendVerification } from '../hooks/use-resend-verification';

const CONTEXT_BANNER_MESSAGE: Record<string, string> = {
  session_required: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  account_deactivated: 'Tài khoản của bạn đã được vô hiệu hóa.',
};

export function LoginForm() {
  const { values, fieldErrors, bannerError, isSubmitting, updateField, submit } = useLoginForm();
  const resendVerification = useResendVerification(values.email);
  const reason = useSearchParams().get('reason');
  const contextMessage = reason ? CONTEXT_BANNER_MESSAGE[reason] : undefined;

  return (
    <AuthFormCard
      title="Đăng nhập"
      footerSlot={
        <>
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-neon-cyan hover:underline">
            Đăng ký
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
        {contextMessage && !bannerError ? (
          <ErrorBanner variant="warning" message={contextMessage} />
        ) : null}

        {bannerError ? (
          <div>
            <ErrorBanner
              variant={bannerError.variant}
              message={bannerError.message}
              countdownSeconds={bannerError.countdownSeconds}
            />
            {bannerError.showResendVerificationAction ? (
              <button
                type="button"
                onClick={() => void resendVerification.resend()}
                disabled={resendVerification.isSubmitting || resendVerification.isCoolingDown}
                className="mb-2 text-sm text-neon-cyan hover:underline disabled:opacity-50"
              >
                Gửi lại email xác thực
              </button>
            ) : null}
            {resendVerification.isCoolingDown ? (
              <CountdownText
                secondsRemaining={resendVerification.secondsRemaining}
                className="text-slate-400"
              />
            ) : null}
          </div>
        ) : null}

        <TextField
          id="login-email"
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
            id="login-password"
            label="Mật khẩu"
            value={values.password}
            onChange={(value) => updateField('password', value)}
            error={fieldErrors.password}
            disabled={isSubmitting}
            autoComplete="current-password"
          />
          <div className="mt-1.5 text-right">
            <Link href="/forgot-password" className="text-sm text-neon-cyan hover:underline">
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        <PrimaryButton type="submit" isLoading={isSubmitting} className="mt-2">
          Đăng nhập
        </PrimaryButton>
      </form>
    </AuthFormCard>
  );
}
