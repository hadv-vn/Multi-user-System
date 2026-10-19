'use client';

import { useState } from 'react';

import { GlassCard } from '@/components/ui/GlassCard';
import { DeactivateConfirmDialog } from './DeactivateConfirmDialog';

export function DeactivateAccountSection() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <GlassCard variant="danger">
      <h2 className="mb-2 font-heading text-lg font-semibold text-neon-danger">
        Vô hiệu hóa tài khoản
      </h2>
      <p className="mb-4 text-sm text-slate-400">
        Hành động này sẽ vô hiệu hóa tài khoản của bạn và đăng xuất ngay lập tức. Bạn không thể tự
        khôi phục lại tài khoản sau khi xác nhận.
      </p>
      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        className="rounded-xl border border-neon-danger/50 px-4 py-2.5 text-sm font-medium text-neon-danger transition-colors hover:bg-neon-danger/10"
      >
        Vô hiệu hóa tài khoản của tôi
      </button>

      <DeactivateConfirmDialog isOpen={isDialogOpen} onCancel={() => setIsDialogOpen(false)} />
    </GlassCard>
  );
}
