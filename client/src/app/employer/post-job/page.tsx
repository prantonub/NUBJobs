'use client';

import { FC, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateJob, usePublishJob, useImproveDescription } from '@/hooks/useEmployer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, Wand2, Plus, Trash2, Loader2 } from 'lucide-react';

const JobPostingWizard: FC = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isImproving, setIsImproving] = useState(false);
  const createJobMutation = useCreateJob();
  const publishJobMutation = usePublishJob();
  const improveDescMutation = useImproveDescription();

  const [formData, setFormData] = useState({
    title: '',
    type: 'FULL_TIME',
    location: '',
    salaryMin: '',
    salaryMax: '',
    category: '',
    description: '',
    minCgpa: '',
    skills: [] as string[],
    deadline: '',
    targetUniversity: 'ALL',
  });

  const [skillInput, setSkillInput] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (index: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const handleImproveDescription = async () => {
    if (!formData.description) {
      toast.error('Enter a description first');
      return;
    }
    setIsImproving(true);
    try {
      const result = await improveDescMutation.mutateAsync(formData.description);
      setFormData(prev => ({ ...prev, description: result.improved }));
      toast.success('Description improved!');
    } catch (error) {
      toast.error('Failed to improve description');
    } finally {
      setIsImproving(false);
    }
  };

  const handlePublish = async () => {
    try {
      const newJob = await createJobMutation.mutateAsync(formData);
      await publishJobMutation.mutateAsync(newJob.id);
      toast.success('Job published successfully!');
      router.push('/employer/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to publish job');
    }
  };

  const handleSaveDraft = async () => {
    try {
      await createJobMutation.mutateAsync({
        ...formData,
        status: 'DRAFT',
      });
      toast.success('Job saved as draft');
      router.push('/employer/jobs');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save job');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Post a New Job</h1>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s, i) => (
              <div key={s}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                {i < 3 && (
                  <div
                    className={`w-12 h-1 ${
                      step > s ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Basic Information</h2>

              <div>
                <label className="block text-sm font-medium mb-2">Job Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Senior React Developer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Job Type *</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="e.g., Engineering"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Dhaka, Bangladesh"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Salary Min (৳)</label>
                  <Input
                    type="number"
                    value={formData.salaryMin}
                    onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Salary Max (৳)</label>
                  <Input
                    type="number"
                    value={formData.salaryMax}
                    onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Requirements */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Requirements</h2>

              <div>
                <label className="block text-sm font-medium mb-2">Minimum CGPA</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="4"
                  value={formData.minCgpa}
                  onChange={(e) => handleInputChange('minCgpa', e.target.value)}
                  placeholder="e.g., 3.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target University</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="ALL"
                      checked={formData.targetUniversity === 'ALL'}
                      onChange={(e) => handleInputChange('targetUniversity', e.target.value)}
                    />
                    All Universities
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="NUB"
                      checked={formData.targetUniversity === 'NUB'}
                      onChange={(e) => handleInputChange('targetUniversity', e.target.value)}
                    />
                    NUB Only
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Required Skills *</label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Add a skill and press Enter"
                  />
                  <Button type="button" onClick={handleAddSkill} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary">
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(i)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Application Deadline</label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => handleInputChange('deadline', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Description */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Job Description</h2>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the role, responsibilities, and requirements..."
                  rows={8}
                  className="resize-none"
                />
              </div>

              <Button
                type="button"
                onClick={handleImproveDescription}
                disabled={isImproving}
                variant="outline"
              >
                {isImproving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Wand2 className="w-4 h-4 mr-2" />
                AI Improve Description
              </Button>
            </div>
          )}

          {/* Step 4: Preview & Publish */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Preview & Publish</h2>

              <Card className="p-6 bg-gray-50">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Job Title</p>
                    <p className="text-xl font-semibold">{formData.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-semibold">{formData.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-semibold">{formData.location || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Salary</p>
                      <p className="font-semibold">
                        ৳{formData.salaryMin}-{formData.salaryMax}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Min CGPA</p>
                      <p className="font-semibold">{formData.minCgpa || 'Any'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, i) => (
                        <Badge key={i} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Description</p>
                    <p className="text-sm whitespace-pre-wrap text-gray-700">
                      {formData.description}
                    </p>
                  </div>
                </div>
              </Card>

              <div className="text-sm text-gray-600 p-4 bg-blue-50 rounded">
                ✓ All required fields are filled. Ready to publish!
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between gap-4 mt-8 pt-8 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              {step === 4 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={createJobMutation.isPending}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePublish}
                    disabled={createJobMutation.isPending}
                  >
                    {createJobMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Publish Job
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => setStep(Math.min(4, step + 1))}
                  disabled={step === 1 && !formData.title}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default JobPostingWizard;