'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home as HomeIcon,
  User,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

/** Twitter-style left sidebar (spec §SIDEBAR). */
export function SocialSidebar({
  className,
  collapsed,
  children,
}: {
  className?: string;
  collapsed?: boolean;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const myUsername = user?.username;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [innerCollapsed, setInnerCollapsed] = useState(collapsed ?? false);

  const isHome = pathname === '/social' || pathname === '/social/home';
  const isProfile = Boolean(myUsername) && pathname.startsWith('/social/profile/' + myUsername);

  // Messages + Notifications live in the global top navbar (/messages + bell),
  // so the social sidebar stays focused on Feed / Profile / New Post.
  const menu = innerCollapsed ? [] : [
    { label: 'Feed', href: '/social', icon: <HomeIcon className="size-5" />, active: isHome },
    {
      label: 'Profile',
      href: myUsername ? `/social/profile/${myUsername}` : '/social',
      icon: <User className="size-5" />,
      active: isProfile,
    },
  ];

  const renderItem = (item: any) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        'flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        item.active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {item.icon}
      <span>{item.label}</span>
      {typeof item.badge === 'number' && item.badge > 0 && (
        <span className="ml-auto flex shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  );

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* Positioned below the sticky top navbar (h-16, z-50) so it stays visible. */}
      <aside
        className={cn(
          'fixed bottom-0 left-0 top-16 z-40 flex w-64 flex-col border-r border-border bg-background transition-transform duration-200 lg:translate-x-0',
          innerCollapsed ? '-translate-x-full' : 'translate-x-0',
          className
        )}
      >
        <div className="h-2 shrink-0" />
        
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {menu.map(renderItem)}

          <Link
            href="/social/post/new"
            className="mx-3 mt-2 flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            New Post
          </Link>
        </nav>

        <div className="border-t border-border p-3">
          <p className="truncate text-xs text-muted-foreground">v2.0 · Twitter-style social hub</p>
        </div>
      </aside>

      {!innerCollapsed && (
        <>
          <div
            onClick={() => setMobileOpen(true)}
            className="flex shrink-0 items-center gap-2 border-b border-border bg-white px-3 py-2 lg:hidden"
          >
            <button
              onClick={() => setMobileOpen(true)}
              className="flex size-7 items-center justify-center rounded hover:bg-muted"
              aria-label="Open menu"
            >
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm font-semibold">Menu</span>
          </div>
        </>
      )}
    </>
  );
}

/** A single nav item for the top bar (used inside Shell). */
export function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  onClick,
}: {
  href: string;
  label: string;
  icon?: React.ElementType;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  const base =
    'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors';
  const activeClass = 'bg-primary text-primary-foreground';
  const inactiveClass = 'text-muted-foreground hover:bg-muted hover:text-foreground';

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(base, active ? activeClass : inactiveClass)}
    >
      {Icon && <Icon className="size-4" />}
      <span>{label}</span>
      {typeof badge === 'number' && badge > 0 && (
        <span className="flex size-4 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
