import { Suspense } from 'react';

import { VerifyEmailHandler } from '@/features/auth/components/VerifyEmailHandler';

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailHandler />
    </Suspense>
  );
}
