import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { dashboardNav } from '@/components/layout/dashboard-nav';
import { RequireAuth } from '@/lib/middleware';

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth allowedRoles={['STUDENT']}>
      <DashboardLayout
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }]}
        nav={dashboardNav}
      >
        {children}
      </DashboardLayout>
    </RequireAuth>
  );
}