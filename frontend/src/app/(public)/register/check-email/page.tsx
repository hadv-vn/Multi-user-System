import { Suspense } from 'react';

import { CheckEmailPanel } from '@/features/auth/components/CheckEmailPanel';

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailPanel />
    </Suspense>
  );
}
