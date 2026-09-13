import { Router } from 'express';
import { z } from 'zod';
import {
  listEvents,
  getEventDetail,
  createEvent,
  updateEvent,
  deleteEvent,
  toggleEventRsvp,
  getEventRsvps,
  notifyEligibleStudents,
} from '../controllers/events.controller';
import { authenticate, requireRole, validate, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Validation schemas
const createEventSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20),
  eventDate: z.string().datetime(),
  location: z.string().min(5),
  capacity: z.number().optional(),
  minCgpa: z.number().min(0).max(4.0).optional(),
  imageUrl: z.string().url().optional(),
  registrationLink: z.string().url().optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(20).optional(),
  eventDate: z.string().datetime().optional(),
  location: z.string().min(5).optional(),
  capacity: z.number().optional(),
  minCgpa: z.number().min(0).max(4.0).optional(),
  imageUrl: z.string().url().optional(),
  registrationLink: z.string().url().optional(),
});

// Public routes
router.get('/', optionalAuth, listEvents);
router.get('/:id', optionalAuth, getEventDetail);

// Student routes
router.post('/:id/rsvp', authenticate, toggleEventRsvp);

// Organizer/Admin routes
router.post('/', authenticate, requireRole('ADMIN', 'MODERATOR'), validate(createEventSchema), createEvent);
router.put('/:id', authenticate, validate(updateEventSchema), updateEvent);
router.delete('/:id', authenticate, deleteEvent);
router.get('/:id/rsvps', authenticate, getEventRsvps);
router.post('/:id/notify-eligible', authenticate, notifyEligibleStudents);

export default router;