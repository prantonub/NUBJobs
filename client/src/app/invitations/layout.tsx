import { UserSectionLayout } from '@/components/layout/UserSectionLayout';

export default function InvitationsLayout({ children }: { children: React.ReactNode }) {
  return <UserSectionLayout label="Invitations">{children}</UserSectionLayout>;
}