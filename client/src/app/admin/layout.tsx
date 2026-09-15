import {
  BarChart3Icon,
  BriefcaseBusinessIcon,
  Building2Icon,
  DatabaseIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const adminNav = [
  { href: '/admin', label: 'Overview', icon: <LayoutDashboardIcon className="size-4" /> },
  { href: '/admin/database', label: 'Database', icon: <DatabaseIcon className="size-4" /> },
  { href: '/admin/users', label: 'Users', icon: <UsersIcon className="size-4" /> },
  { href: '/admin/jobs', label: 'Jobs', icon: <BriefcaseBusinessIcon className="size-4" /> },
  { href: '/admin/companies', label: 'Companies', icon: <Building2Icon className="size-4" /> },
  { href: '/admin/analytics', label: 'Analytics', icon: <BarChart3Icon className="size-4" /> },
  { href: '/admin/security', label: 'Security', icon: <ShieldCheckIcon className="size-4" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      title="Admin Console"
      breadcrumbs={[{ label: 'Admin', href: '/admin' }]}
      nav={adminNav}
    >
      {children}
    </DashboardLayout>
  );
}
