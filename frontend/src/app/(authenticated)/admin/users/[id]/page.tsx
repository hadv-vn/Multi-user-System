import { AdminUserDetailPage } from '@/features/admin/components/AdminUserDetailPage';
import { UserTaskStatsCard } from '@/features/admin-task-stats/components/UserTaskStatsCard';

export default async function AdminUserDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminUserDetailPage userId={id} extraSections={<UserTaskStatsCard userId={id} />} />;
}
