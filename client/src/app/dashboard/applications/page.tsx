'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import { useApplications, useWithdrawApplication } from '@/hooks/useApplications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const ApplicationsPage: FC = () => {
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  
  const { data, isLoading } = useApplications(status || undefined, page);
  const withdrawMutation = useWithdrawApplication();

  const statuses = ['all', 'APPLIED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEWED', 'HIRED', 'REJECTED'];

  const statusColors: Record<string, string> = {
    APPLIED: 'bg-blue-100 text-blue-800',
    REVIEWED: 'bg-purple-100 text-purple-800',
    SHORTLISTED: 'bg-yellow-100 text-yellow-800',
    INTERVIEWED: 'bg-indigo-100 text-indigo-800',
    HIRED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };

  const handleWithdraw = async (applicationId: string) => {
    try {
      await withdrawMutation.mutateAsync(applicationId);
      toast.success('Application withdrawn');
      setWithdrawId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to withdraw application');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">My Applications</h1>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {statuses.map((s) => (
            <Button
              key={s}
              variant={status === (s === 'all' ? '') : s ? 'default' : 'outline'}
              onClick={() => {
                setStatus(s === 'all' ? '' : s);
                setPage(1);
              }}
            >
              {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>

        {/* Applications Table */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-600">Loading...</div>
          ) : data?.data?.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-4 px-6">Job Title</th>
                      <th className="text-left py-4 px-6">Company</th>
                      <th className="text-left py-4 px-6">Status</th>
                      <th className="text-left py-4 px-6">Applied</th>
                      <th className="text-left py-4 px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((application: any) => (
                      <tr key={application.id} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-6 font-medium">
                          <Link href={`/applications/${application.id}`} className="text-blue-600 hover:underline">
                            {application.job.title}
                          </Link>
                        </td>
                        <td className="py-4 px-6">{application.job.employer.companyName}</td>
                        <td className="py-4 px-6">
                          <Badge className={statusColors[application.status] || 'bg-gray-100'}>
                            {application.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {new Date(application.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setWithdrawId(application.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Withdraw
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data?.pagination?.pages > 1 && (
                <div className="flex justify-center gap-2 p-6 border-t">
                  {Array.from({ length: data.pagination.pages }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-gray-600">
              No applications found. <Link href="/jobs" className="text-blue-600 hover:underline">Browse jobs</Link>
            </div>
          )}
        </Card>
      </div>

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={!!withdrawId} onOpenChange={(open) => !open && setWithdrawId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw this application? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => withdrawId && handleWithdraw(withdrawId)}
            className="bg-red-600 hover:bg-red-700"
          >
            Withdraw
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApplicationsPage;