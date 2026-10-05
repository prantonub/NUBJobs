import {
  BarChart3Icon,
  BriefcaseBusinessIcon,
  Building2Icon,
  InboxIcon,
  KanbanSquareIcon,
  LayoutDashboardIcon,
  MessagesSquareIcon,
  ScaleIcon,
  ScrollTextIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RequireAuth } from '@/lib/middleware';

const adminNav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboardIcon className="size-4" /> },
  { href: '/admin/users', label: 'Users', icon: <UsersIcon className="size-4" /> },
  { href: '/admin/jobs', label: 'Jobs', icon: <BriefcaseBusinessIcon className="size-4" /> },
  { href: '/admin/companies', label: 'Companies', icon: <Building2Icon className="size-4" /> },
  { href: '/admin/applications', label: 'Applications', icon: <InboxIcon className="size-4" /> },
  { href: '/admin/pipeline', label: 'Pipeline', icon: <KanbanSquareIcon className="size-4" /> },
  { href: '/admin/disputes', label: 'Disputes', icon: <ScaleIcon className="size-4" /> },
  { href: '/admin/analytics', label: 'Analytics', icon: <BarChart3Icon className="size-4" /> },
  { href: '/admin/messages', label: 'Messages', icon: <MessagesSquareIcon className="size-4" /> },
  { href: '/admin/settings', label: 'Settings', icon: <SettingsIcon className="size-4" /> },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: <ScrollTextIcon className="size-4" /> },
];

/**
 * /admin/* shell — spec rule: ONLY ADMIN accounts may enter these routes.
 * Every /api/admin/* call underneath is additionally gated by
 * authenticate + requireRole('ADMIN') + tier permissions server-side.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth allowedRoles={['ADMIN']}>
      <DashboardLayout
        title="Admin Console"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }]}
        nav={adminNav}
      >
        {children}
      </DashboardLayout>
    </RequireAuth>
  );
}
