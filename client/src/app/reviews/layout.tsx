import { UserSectionLayout } from '@/components/layout/UserSectionLayout';

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <UserSectionLayout label="Reviews">{children}</UserSectionLayout>;
}