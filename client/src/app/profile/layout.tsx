import { UserSectionLayout } from '@/components/layout/UserSectionLayout';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <UserSectionLayout label="My Profile">{children}</UserSectionLayout>;
}