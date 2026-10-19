'use client';

import Link from 'next/link';
import { useState } from 'react';

import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import { authApi } from '@/lib/auth/auth-api';
import { displayMessageFor, hasCountdown } from '@/lib/auth/auth-error-display';
import { ApiError } from '@/lib/http/api-error';
import { isEmailValid } from '@/lib/validation/email-rule';

interface BannerError {
  message: string;
  countdownSeconds?: number;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [bannerError, setBannerError] = useState<BannerError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function submit(): Promise<void> {
    if (!email) {
      setEmailError('Vui lòng nhập email');
      return;
    }
    if (!isEmailValid(email)) {
      setEmailError('Email không đúng định dạng');
      return;
    }
    setEmailError(undefined);
    setBannerError(null);

    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setIsSent(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setBannerError({
          message: displayMessageFor(error),
          countdownSeconds: hasCountdown(error) ? error.retryAfterSeconds : undefined,
        });
      } else {
        setBannerError({ message: 'Đã có lỗi xảy ra, vui lòng thử lại sau.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <AuthFormCard title="Quên mật khẩu?">
        <p className="text-center text-sm text-slate-300">
          Nếu địa chỉ email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến
          email đó. Vui lòng kiểm tra hộp thư.
        </p>
        <Link
          href="/login"
          className="mt-6 block text-center text-sm text-neon-cyan hover:underline"
        >
          Quay lại đăng nhập
        </Link>
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard
      title="Quên mật khẩu?"
      subtitle="Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu."
      footerSlot={
        <Link href="/login" className="text-neon-cyan hover:underline">
          Quay lại đăng nhập
        </Link>
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
          id="forgot-password-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          error={emailError}
          disabled={isSubmitting}
          autoComplete="email"
        />

        <PrimaryButton type="submit" isLoading={isSubmitting} className="mt-2">
          Gửi liên kết đặt lại mật khẩu
        </PrimaryButton>
      </form>
    </AuthFormCard>
  );
}
