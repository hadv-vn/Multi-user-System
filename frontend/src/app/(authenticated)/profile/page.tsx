import { ChangePasswordSection } from '@/features/account/components/ChangePasswordSection';
import { DeactivateAccountSection } from '@/features/account/components/DeactivateAccountSection';
import { ProfileBasicInfoSection } from '@/features/account/components/ProfileBasicInfoSection';

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <ProfileBasicInfoSection />
      <ChangePasswordSection />
      <DeactivateAccountSection />
    </div>
  );
}
