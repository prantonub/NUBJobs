import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { dashboardNav } from '@/components/layout/dashboard-nav';

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }]}
      nav={dashboardNav}
    >
      {children}
    </DashboardLayout>
  );
}