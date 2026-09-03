"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookmarkIcon,
  BriefcaseIcon,
  ChevronRightIcon,
  FileTextIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Breadcrumb[];
  nav?: DashboardNavItem[];
}

const DEFAULT_NAV: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: <LayoutDashboardIcon /> },
  { href: "/jobs", label: "Browse Jobs", icon: <BriefcaseIcon /> },
  {
    href: "/dashboard/applications",
    label: "My Applications",
    icon: <FileTextIcon />,
  },
  { href: "/dashboard/saved", label: "Saved Jobs", icon: <BookmarkIcon /> },
  { href: "/profile", label: "Profile", icon: <UserIcon /> },
  { href: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

function SidebarNav({
  nav,
  pathname,
  onNavigate,
}: {
  nav: DashboardNavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
            isActive(pathname, item.href)
              ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-100"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * App shell for authenticated areas: a fixed sidebar (active item tracked via
 * usePathname), a user block with sign-out, a top bar with breadcrumb support,
 * and a slide-in sidebar Sheet on mobile.
 */
export function DashboardLayout({
  children,
  title,
  breadcrumbs,
  nav = DEFAULT_NAV,
}: DashboardLayoutProps) {
  const pathname = usePathname() ?? "";
  const { user, logout } = useAuth();
  const [open, setOpen] = React.useState(false);

  const brand = (
    <Link href="/" className="flex items-center gap-2 px-4 py-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <GraduationCapIcon className="size-5" />
      </span>
      <span className="font-heading text-lg font-bold tracking-tight text-foreground">
        NUB<span className="text-brand-600">Jobs</span>
      </span>
    </Link>
  );

  const userBlock = (
    <div className="mt-auto border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <Avatar size="sm">
          {user?.avatar ? (
            <AvatarImage src={String(user.avatar)} alt={user?.name ?? "User"} />
          ) : null}
          <AvatarFallback>{getInitials(user?.name ?? "User")}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {user?.name ?? "Guest"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.email ?? "Not signed in"}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="mt-1 w-full justify-start text-muted-foreground"
        onClick={() => logout()}
      >
        <LogOutIcon className="size-4" />
        Log out
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-background md:flex">
        {brand}
        <Separator />
        <SidebarNav nav={nav} pathname={pathname} />
        {userBlock}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open sidebar"
              >
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
              </SheetHeader>
              <div className="flex h-full flex-col">
                {brand}
                <Separator />
                <SidebarNav
                  nav={nav}
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                />
                {userBlock}
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            {breadcrumbs?.length ? (
              breadcrumbs.map((crumb, i) => {
                const last = i === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={`${crumb.label}-${i}`}>
                    {i > 0 ? (
                      <ChevronRightIcon className="size-3.5 text-muted-foreground" />
                    ) : null}
                    {crumb.href && !last ? (
                      <Link
                        href={crumb.href}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={cn(
                          "truncate",
                          last
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <span className="font-medium text-foreground">
                {title ?? "Dashboard"}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {title ? (
            <h1 className="mb-6 font-heading text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
