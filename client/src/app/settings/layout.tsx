import { UserSectionLayout } from '@/components/layout/UserSectionLayout';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <UserSectionLayout label="Account Settings">{children}</UserSectionLayout>;
}