import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact | NUBJobs',
  description:
    'Contact the NUBJobs support team questions about jobs, your account, messaging or a company.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}