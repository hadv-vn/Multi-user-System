import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';

import { ToastProvider } from '@/components/ui/toast/ToastProvider';
import { SessionProvider } from '@/lib/session/session-context';

import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ variable: '--font-space-grotesk', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Multi-User System',
  description: 'Hệ thống đăng ký/đăng nhập và quản trị người dùng (Auth/RBAC).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
