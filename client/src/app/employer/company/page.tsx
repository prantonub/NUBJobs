'use client';

import { FC, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCompanyProfile,
  useUpdateCompanyProfile,
  useUploadLogo,
  useUploadVerificationDocument,
  useRequestVerification,
  useVerificationStatus,
} from '@/hooks/useEmployer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Upload, Check, Clock } from 'lucide-react';

const profileSchema = z.object({
  companyName: z.string().min(3),
  about: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const CompanyProfilePage: FC = () => {
  const { data: profile, isLoading } = useCompanyProfile();
  const { data: verificationStatus } = useVerificationStatus();
  const updateProfileMutation = useUpdateCompanyProfile();
  const uploadLogoMutation = useUploadLogo();
  const uploadDocumentMutation = useUploadVerificationDocument();
  const requestVerificationMutation = useRequestVerification();

  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationData, setVerificationData] = useState({
    documentType: 'TRADE_LICENSE',
    registrationNumber: '',
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Reset form when profile loads
  React.useEffect(() => {
    if (profile) {
      reset({
        companyName: profile.companyName,
        about: profile.about || '',
        website: profile.website || '',
        linkedinUrl: profile.linkedinUrl || '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfileMutation.mutateAsync(data);
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadLogoMutation.mutateAsync(file);
        toast.success('Logo uploaded!');
      } catch (error) {
        toast.error('Failed to upload logo');
      }
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadDocumentMutation.mutateAsync(file);
        toast.success('Document uploaded for verification!');
      } catch (error) {
        toast.error('Failed to upload document');
      }
    }
  };

  const handleRequestVerification = async () => {
    try {
      await requestVerificationMutation.mutateAsync(verificationData);
      toast.success('Verification request submitted!');
      setShowVerificationDialog(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request verification');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Company Profile</h1>

        {/* Logo Section */}
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Company Logo</h2>
          <div className="flex items-center gap-6">
            {profile?.logoUrl && (
              <img
                src={profile.logoUrl}
                alt="Company Logo"
                className="w-24 h-24 rounded object-cover"
              />
            )}
            <div>
              <label className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Logo
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploadLogoMutation.isPending}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 5MB</p>
            </div>
          </div>
        </Card>

        {/* Company Info */}
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Company Information</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name *</label>
              <Input {...register('companyName')} placeholder="Your company name" />
              {errors.companyName && (
                <p className="text-red-600 text-xs mt-1">{errors.companyName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">About</label>
              <Textarea
                {...register('about')}
                placeholder="Tell us about your company..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <Input {...register('website')} placeholder="https://yourcompany.com" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
              <Input {...register('linkedinUrl')} placeholder="https://linkedin.com/company/..." />
            </div>

            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {updateProfileMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </form>
        </Card>

        {/* Verification Section */}
        <Card className="mb-6 p-6 border-blue-200 bg-blue-50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Company Verification</h2>
              <p className="text-sm text-gray-600 mt-1">
                Get verified to build trust with candidates
              </p>
            </div>

            {verificationStatus?.isVerified && (
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Verified
              </Badge>
            )}
            {!verificationStatus?.isVerified && (
              <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Pending
              </Badge>
            )}
          </div>

          {!verificationStatus?.isVerified && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm mb-2">Upload Verification Document</h3>
                <label className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Document
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    className="hidden"
                    onChange={handleDocumentUpload}
                    disabled={uploadDocumentMutation.isPending}
                  />
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Trade license, registration certificate, or tax ID
                </p>
              </div>

              <Button
                onClick={() => setShowVerificationDialog(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Request Verification
              </Button>

              <p className="text-xs text-gray-600">
                ✓ Verification takes 24-48 hours. You'll receive an email when approved.
              </p>
            </div>
          )}

          {verificationStatus?.isVerified && (
            <div className="p-4 bg-green-100 text-green-800 rounded">
              Your company is verified! You have access to all premium features.
            </div>
          )}
        </Card>

        {/* Stats */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Company Stats</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Jobs Posted</p>
              <p className="text-2xl font-bold mt-1">{profile?.jobsPosted || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Member Since</p>
              <p className="text-sm font-semibold mt-1">
                {profile?.user?.createdAt
                  ? new Date(profile.user.createdAt).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Verification</p>
              <Badge className="mt-1">
                {profile?.isVerified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Verification Dialog */}
      <AlertDialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Company Verification</AlertDialogTitle>
            <AlertDialogDescription>
              Provide your company details for verification
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">Document Type</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={verificationData.documentType}
                onChange={(e) =>
                  setVerificationData(prev => ({
                    ...prev,
                    documentType: e.target.value,
                  }))
                }
              >
                <option value="TRADE_LICENSE">Trade License</option>
                <option value="REGISTRATION">Business Registration</option>
                <option value="TAX_ID">Tax ID</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Registration Number</label>
              <Input
                value={verificationData.registrationNumber}
                onChange={(e) =>
                  setVerificationData(prev => ({
                    ...prev,
                    registrationNumber: e.target.value,
                  }))
                }
                placeholder="e.g., TL-2024-12345"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRequestVerification}
              disabled={
                !verificationData.registrationNumber ||
                requestVerificationMutation.isPending
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {requestVerificationMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Submit Request
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompanyProfilePage;