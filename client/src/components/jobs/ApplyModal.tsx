'use client';

import { FC, useState } from 'react';
import { useCreateApplication } from '@/hooks/useApplications';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
}

const ApplyModal: FC<ApplyModalProps> = ({ open, onOpenChange, jobId, jobTitle }) => {
  const [coverLetter, setCoverLetter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const createApplicationMutation = useCreateApplication();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createApplicationMutation.mutateAsync({
        jobId,
        coverLetter,
      });
      toast.success('Application submitted successfully!');
      onOpenChange(false);
      setCoverLetter('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit application');
    }
  };

  const handleGenerateCoverLetter = async () => {
    setIsGenerating(true);
    try {
      // Call API to generate cover letter
      const response = await fetch(`/api/applications/generate-cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await response.json();
      setCoverLetter(data.data || '');
      toast.success('Cover letter generated!');
    } catch (error) {
      toast.error('Failed to generate cover letter');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply for {jobTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Cover Letter (Optional)</label>
            <Textarea
              placeholder="Tell us why you're a great fit for this role..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to apply with just your resume
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateCoverLetter}
              disabled={isGenerating}
            >
              {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              AI Generate Cover Letter
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createApplicationMutation.isPending}
            >
              {createApplicationMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Submit Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyModal;