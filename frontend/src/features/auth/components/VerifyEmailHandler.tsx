'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { StatusResultCard } from '@/components/ui/StatusResultCard';
import { useVerifyEmailToken } from '../hooks/use-verify-email-token';

const AUTO_REDIRECT_DELAY_MS = 4000;

export function VerifyEmailHandler() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const state = useVerifyEmailToken(token);

  useEffect(() => {
    if (state.kind !== 'verified') return;
    const timer = setTimeout(() => router.push('/login'), AUTO_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.kind, router]);

  const goToLogin = () => router.push('/login');
  const requestNewVerification = () => router.push('/register/check-email');

  return <AuthScreenLayout>{renderCard(state.kind, goToLogin, requestNewVerification)}</AuthScreenLayout>;
}

function renderCard(
  kind: ReturnType<typeof useVerifyEmailToken>['kind'],
  goToLogin: () => void,
  requestNewVerification: () => void,
) {
  switch (kind) {
    case 'loading':
      return (
        <StatusResultCard icon="loading" title="Đang xác thực tài khoản của bạn..." description="" />
      );
    case 'verified':
      return (
        <StatusResultCard
          icon="success"
          title="Xác thực thành công!"
          description="Tài khoản của bạn đã được kích hoạt."
          primaryAction={{ label: 'Đến trang đăng nhập', onClick: goToLogin }}
        />
      );
    case 'alreadyVerified':
      return (
        <StatusResultCard
          icon="success"
          title="Tài khoản đã được xác thực trước đó"
          description="Bạn có thể đăng nhập ngay bây giờ."
          primaryAction={{ label: 'Đến trang đăng nhập', onClick: goToLogin }}
        />
      );
    case 'expired':
      return (
        <StatusResultCard
          icon="warning"
          title="Liên kết đã hết hạn"
          description="Liên kết xác thực này đã hết hạn sau 24 giờ."
          primaryAction={{ label: 'Gửi lại email xác thực', onClick: requestNewVerification }}
        />
      );
    case 'invalid':
      return (
        <StatusResultCard
          icon="error"
          title="Liên kết không hợp lệ"
          description="Liên kết xác thực không đúng hoặc đã bị hỏng."
          primaryAction={{ label: 'Gửi lại email xác thực', onClick: requestNewVerification }}
          secondaryAction={{ label: 'Về trang đăng nhập', onClick: goToLogin }}
        />
      );
  }
}
