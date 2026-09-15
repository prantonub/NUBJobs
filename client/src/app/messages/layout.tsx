import { UserSectionLayout } from '@/components/layout/UserSectionLayout';

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <UserSectionLayout label="Messages">{children}</UserSectionLayout>;
}