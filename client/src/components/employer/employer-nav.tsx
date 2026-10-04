import {
  BarChart3Icon,
  BriefcaseIcon,
  Building2Icon,
  FilePlus2Icon,
  FileTextIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  SettingsIcon,
  TargetIcon,
} from 'lucide-react';
import type { DashboardNavItem } from '@/components/layout/DashboardLayout';

/**
 * Employer sidebar (spec): Dashboard, Company Profile, Post New Job, My Jobs,
 * Applications, Pipeline, Analytics, Messages, Settings.
 */
export const employerNav: DashboardNavItem[] = [
  { href: '/employer/dashboard', label: 'Dashboard', icon: <LayoutDashboardIcon /> },
  { href: '/employer/company', label: 'Company Profile', icon: <Building2Icon /> },
  { href: '/employer/post-job', label: 'Post New Job', icon: <FilePlus2Icon /> },
  { href: '/employer/jobs', label: 'My Jobs', icon: <BriefcaseIcon /> },
  { href: '/employer/applications', label: 'Applications', icon: <FileTextIcon /> },
  { href: '/employer/pipeline', label: 'Pipeline', icon: <TargetIcon /> },
  { href: '/employer/analytics', label: 'Analytics', icon: <BarChart3Icon /> },
  { href: '/employer/messages', label: 'Messages', icon: <MessageSquareIcon /> },
  { href: '/employer/settings', label: 'Settings', icon: <SettingsIcon /> },
];
