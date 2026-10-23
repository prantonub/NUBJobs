import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Search Talent | NUBJobs' },
  description:
    'Find Northern University Bangladesh students who have opted in to employer discovery filter by program, graduation year and skills.',
};

export default function SearchTalentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}