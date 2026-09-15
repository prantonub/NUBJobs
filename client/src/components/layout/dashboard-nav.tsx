import {
  BookmarkIcon,
  FileCheckIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  SettingsIcon,
  StarIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react';
import type { DashboardNavItem } from './DashboardLayout';

export const dashboardNav: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboardIcon /> },
  { href: '/profile', label: 'My Profile', icon: <UserIcon /> },
  { href: '/dashboard/applications', label: 'Applications', icon: <FileTextIcon /> },
  { href: '/invitations', label: 'Invitations', icon: <UsersIcon /> },
  { href: '/dashboard/saved', label: 'Saved', icon: <BookmarkIcon /> },
  { href: '/dashboard/cv-ats', label: 'CV & ATS', icon: <FileCheckIcon /> },
  { href: '/reviews', label: 'Reviews', icon: <StarIcon /> },
  { href: '/messages', label: 'Messages', icon: <MessageSquareIcon /> },
  { href: '/settings', label: 'Account Settings', icon: <SettingsIcon /> },
];