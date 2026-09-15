import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { dashboardNav } from '@/components/layout/dashboard-nav';

export function UserSectionLayout({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label }]}
      nav={dashboardNav}
    >
      {children}
    </DashboardLayout>
  );
}