'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { CountdownText } from '@/components/ui/CountdownText';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { useResendVerification } from '../hooks/use-resend-verification';

export function CheckEmailPanel() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const { resend, isSubmitting, errorMessage, secondsRemaining, isCoolingDown } =
    useResendVerification(email);

  return (
    <AuthFormCard
      title="Kiểm tra email của bạn"
      subtitle="Nếu thông tin hợp lệ, chúng tôi đã gửi một email xác thực đến địa chỉ bạn vừa đăng ký. Vui lòng kiểm tra hộp thư (kể cả mục Spam) và bấm vào liên kết để kích hoạt tài khoản."
      footerSlot={
        <Link href="/login" className="text-neon-cyan hover:underline">
          Về trang đăng nhập
        </Link>
      }
    >
      <div className="mb-6 flex justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-neon-cyan/40 text-2xl text-neon-cyan shadow-[0_0_20px_rgba(34,211,238,0.35)]">
          ✉
        </span>
      </div>

      <SecondaryButton onClick={() => void resend()} disabled={isSubmitting || isCoolingDown}>
        Gửi lại email xác thực
      </SecondaryButton>

      {isCoolingDown ? (
        <CountdownText
          secondsRemaining={secondsRemaining}
          template="Bạn vừa yêu cầu gửi lại gần đây, vui lòng thử lại sau {seconds} giây."
          className="mt-3 text-center text-slate-400"
        />
      ) : null}

      {errorMessage ? <ErrorBanner message={errorMessage} className="mt-3" /> : null}
    </AuthFormCard>
  );
}
