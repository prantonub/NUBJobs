'use client';

import { FC, useState } from 'react';
import { useEvents, useToggleEventRsvp, useEventDetail } from '@/hooks/useEvents';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Calendar, MapPin, Users, Lock, Check } from 'lucide-react';

const CampusEventsPage: FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<'UPCOMING' | 'PAST'>('UPCOMING');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data: eventsData, isLoading } = useEvents({ status: selectedStatus });
  const { mutateAsync: toggleRsvp } = useToggleEventRsvp(selectedEvent?.id);

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setShowDetail(true);
  };

  const handleRsvp = async () => {
    try {
      await toggleRsvp();
      toast.success(selectedEvent.hasRsvped ? 'RSVP cancelled' : 'RSVP confirmed!');
      setShowDetail(false);
    } catch (error) {
      toast.error('Failed to update RSVP');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const events = eventsData?.data || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Campus Events</h1>

        {/* Status Tabs */}
        <div className="flex gap-4 mb-8">
          <Button
            variant={selectedStatus === 'UPCOMING' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('UPCOMING')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Upcoming Events
          </Button>
          <Button
            variant={selectedStatus === 'PAST' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('PAST')}
          >
            Past Events
          </Button>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No events at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: any) => (
              <Card
                key={event.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleEventClick(event)}
              >
                {event.imageUrl && (
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                )}

                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{event.title}</h3>

                  {/* Event Info */}
                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.eventDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                    {event.capacity && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {event._count?.rsvps || 0} / {event.capacity} attending
                      </div>
                    )}
                  </div>

                  {/* Eligibility Badge */}
                  <div className="flex items-center gap-2 mb-4">
                    {event.isEligible ? (
                      <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Eligible
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {event.minCgpa && `CGPA ${event.minCgpa}+ required`}
                      </Badge>
                    )}
                  </div>

                  {/* RSVP Button */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                    className="w-full"
                    variant={event.hasRsvped ? 'outline' : 'default'}
                    disabled={!event.isEligible && selectedStatus === 'UPCOMING'}
                  >
                    {event.hasRsvped ? 'Cancel RSVP' : 'RSVP'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {showDetail && selectedEvent && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black bg-opacity-50"
            onClick={() => setShowDetail(false)}
          />
          <div className="w-96 bg-white shadow-lg overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
              <Button
                variant="ghost"
                className="absolute top-4 right-4"
                onClick={() => setShowDetail(false)}
              >
                ✕
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {/* Image */}
              {selectedEvent.imageUrl && (
                <img
                  src={selectedEvent.imageUrl}
                  alt={selectedEvent.title}
                  className="w-full h-48 object-cover rounded"
                />
              )}

              {/* Event Details */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Date</p>
                <p className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedEvent.eventDate).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Location</p>
                <p className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {selectedEvent.location}
                </p>
              </div>

              {selectedEvent.capacity && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Capacity</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${((selectedEvent._count?.rsvps || 0) / selectedEvent.capacity) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedEvent._count?.rsvps || 0} / {selectedEvent.capacity}
                  </p>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">About</p>
                <p className="text-sm text-gray-700">{selectedEvent.description}</p>
              </div>

              {/* Eligibility */}
              <div className="p-4 bg-blue-50 rounded">
                {selectedEvent.isEligible ? (
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    You're eligible to attend this event
                  </p>
                ) : (
                  <p className="text-sm text-red-800 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Minimum CGPA {selectedEvent.minCgpa} required
                  </p>
                )}
              </div>

              {/* Organizer */}
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-xs font-medium text-gray-600 mb-2">Organized by</p>
                <p className="text-sm font-semibold">{selectedEvent.organizer?.name}</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t">
                <Button
                  onClick={handleRsvp}
                  className={`w-full ${
                    selectedEvent.isEligible
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!selectedEvent.isEligible && selectedStatus === 'UPCOMING'}
                >
                  {selectedEvent.hasRsvped ? 'Cancel RSVP' : 'RSVP Now'}
                </Button>

                {selectedEvent.registrationLink && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(selectedEvent.registrationLink, '_blank')}
                  >
                    External Registration
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusEventsPage;