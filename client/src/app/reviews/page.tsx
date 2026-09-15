import Link from 'next/link';
import { StarIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ReviewsPage() {
  return <div className="space-y-6"><div><h1 className="font-heading text-2xl font-bold">Reviews</h1><p className="mt-1 text-sm text-muted-foreground">Feedback from completed applications and interviews will be collected here.</p></div><Card className="p-10 text-center"><StarIcon className="mx-auto mb-3 size-8 text-muted-foreground" /><h2 className="font-semibold">No reviews yet</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Once you complete an employer interaction, this space will help you track feedback and improve your applications.</p><Button asChild className="mt-5"><Link href="/profile">Improve your profile</Link></Button></Card></div>;
}