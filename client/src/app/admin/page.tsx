import { redirect } from 'next/navigation';

/** /admin → /admin/dashboard (single canonical dashboard route per the spec sidebar). */
export default function AdminIndexPage() {
  redirect('/admin/dashboard');
}
