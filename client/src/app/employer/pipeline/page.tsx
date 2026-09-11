'use client';

import { FC, useState } from 'react';
import { useEmployerApplications, useUpdateApplicationStatus } from '@/hooks/useEmployer';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Sortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { GripVertical } from 'lucide-react';

const STATUSES = ['APPLIED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEWED', 'HIRED', 'REJECTED'];

const ApplicationCard: FC<{
  application: any;
  onViewDetails: (app: any) => void;
}> = ({ application, onViewDetails }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-4 rounded-lg border cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div {...listeners} {...attributes} className="text-gray-400 mt-1">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{application.student?.user?.name}</p>
          <p className="text-xs text-gray-600 truncate">{application.job?.title}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {application.student?.skills?.slice(0, 2).map((skill: string) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2 text-xs"
            onClick={() => onViewDetails(application)}
          >
            View Profile
          </Button>
        </div>
      </div>
    </div>
  );
};

const KanbanColumn: FC<{
  status: string;
  applications: any[];
  onViewDetails: (app: any) => void;
}> = ({ status, applications, onViewDetails }) => {
  const { setNodeRef } = useSortable({
    id: status,
    data: { type: 'column' },
  });

  const statusColors: Record<string, string> = {
    APPLIED: 'bg-blue-50 border-blue-200',
    REVIEWED: 'bg-purple-50 border-purple-200',
    SHORTLISTED: 'bg-yellow-50 border-yellow-200',
    INTERVIEWED: 'bg-indigo-50 border-indigo-200',
    HIRED: 'bg-green-50 border-green-200',
    REJECTED: 'bg-red-50 border-red-200',
  };

  return (
    <div
      ref={setNodeRef}
      className={`${statusColors[status]} border rounded-lg p-4 min-h-96`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">{status}</h3>
        <Badge>{applications.length}</Badge>
      </div>

      <div className="space-y-3">
        {applications.map((app: any) => (
          <ApplicationCard
            key={app.id}
            application={app}
            onViewDetails={onViewDetails}
          />
        ))}
        {applications.length === 0 && (
          <p className="text-center text-gray-400 text-xs py-8">No applications</p>
        )}
      </div>
    </div>
  );
};

const ApplicantPipelinePage: FC = () => {
  const { data: applicationsData } = useEmployerApplications();
  const updateStatusMutation = useUpdateApplicationStatus();
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    })
  );

  const groupedApps: Record<string, any[]> = {
    APPLIED: [],
    REVIEWED: [],
    SHORTLISTED: [],
    INTERVIEWED: [],
    HIRED: [],
    REJECTED: [],
  };

  if (applicationsData) {
    Object.entries(applicationsData).forEach(([status, apps]: [string, any]) => {
      if (status in groupedApps) {
        groupedApps[status] = apps;
      }
    });
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const appId = active.id as string;
    const newStatus = over.id as string;

    if (newStatus === active.data?.current?.status) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: appId,
        status: newStatus,
      });
      toast.success(`Application moved to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update application status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-full px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Applicant Pipeline</h1>
          <p className="text-gray-600 mt-2">Drag applications between columns to update status</p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4">
            <div className="grid grid-cols-6 gap-4" style={{ minWidth: 'min(100%, 1400px)' }}>
              {STATUSES.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  applications={groupedApps[status]}
                  onViewDetails={setSelectedApp}
                />
              ))}
            </div>
          </div>
        </DndContext>

        {/* Side Sheet for Application Details */}
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="flex-1 bg-black bg-opacity-50"
              onClick={() => setSelectedApp(null)}
            />
            <div className="w-96 bg-white shadow-lg overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">
                  {selectedApp.student?.user?.name}
                </h2>
                <Button
                  variant="ghost"
                  className="absolute top-4 right-4"
                  onClick={() => setSelectedApp(null)}
                >
                  ✕
                </Button>
              </div>

              <div className="p-6 space-y-4">
                {/* Student Info */}
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-sm">{selectedApp.student?.user?.email}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">CGPA</p>
                  <p className="text-sm">{selectedApp.student?.cgpa?.toFixed(2)}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedApp.student?.skills?.map((skill: string) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Cover Letter */}
                {selectedApp.coverLetter && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Cover Letter</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {selectedApp.coverLetter}
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Notes
                  </label>
                  <textarea
                    defaultValue={selectedApp.notes || ''}
                    className="w-full border rounded p-2 text-sm"
                    rows={3}
                  />
                </div>

                {/* Status Change */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Change Status
                  </label>
                  <select className="w-full border rounded px-3 py-2 text-sm">
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Matched Score */}
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm font-medium">Match Score</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {selectedApp.matchScore || 0}%
                  </p>
                </div>

                <Button className="w-full">Schedule Interview</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicantPipelinePage;