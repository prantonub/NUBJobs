import { SocialSidebar } from '@/components/social/SocialSidebar';

/** Twitter-style layout for all /social/* routes: left sidebar + main content. */
export default function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <SocialSidebar />
      <main className="flex-1 pl-0 lg:pl-64">
        <div className="mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
