import Link from 'next/link';
import { UsersIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function InvitationsPage() {
  return <div className="space-y-6"><div><h1 className="font-heading text-2xl font-bold">Invitations</h1><p className="mt-1 text-sm text-muted-foreground">Interview and employer invitations will appear here.</p></div><Card className="p-10 text-center"><UsersIcon className="mx-auto mb-3 size-8 text-muted-foreground" /><h2 className="font-semibold">No invitations yet</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Apply to relevant roles and keep your messages open. Employers can contact you when they want to continue the conversation.</p><Button asChild className="mt-5"><Link href="/jobs">Explore jobs</Link></Button></Card></div>;
}