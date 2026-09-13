import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * GET /api/events
 * List all campus events with filtering and pagination
 */
export async function listEvents(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status = 'UPCOMING', page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * pageSize;

    const where: any = {};

    // Filter by status
    if (status === 'UPCOMING') {
      where.eventDate = { gte: new Date() };
    } else if (status === 'PAST') {
      where.eventDate = { lt: new Date() };
    }

    const [events, total] = await Promise.all([
      prisma.campusEvent.findMany({
        where,
        include: {
          organizer: { select: { name: true, email: true } },
          _count: { select: { rsvps: true } },
        },
        orderBy: { eventDate: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.campusEvent.count({ where }),
    ]);

    // Calculate eligibility for authenticated users
    let eventsWithEligibility = events;
    if (req.userId) {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: req.userId },
        select: { cgpa: true },
      });

      if (student) {
        eventsWithEligibility = events.map((event) => ({
          ...event,
          isEligible: !event.minCgpa || (student.cgpa && student.cgpa >= event.minCgpa),
        }));
      }
    }

    return responses.ok(res, 'Events fetched', {
      data: eventsWithEligibility,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/events/:id
 * Get single event detail
 */
export async function getEventDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const event = await prisma.campusEvent.findUnique({
      where: { id },
      include: {
        organizer: { select: { name: true, email: true, photoUrl: true } },
        _count: { select: { rsvps: true } },
      },
    });

    if (!event) {
      return responses.notFound(res, 'Event not found');
    }

    // Check eligibility
    let isEligible = true;
    let hasRsvped = false;

    if (req.userId) {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: req.userId },
        select: { cgpa: true },
      });

      if (student) {
        isEligible = !event.minCgpa || (student.cgpa && student.cgpa >= event.minCgpa);
      }

      // Check if user has RSVP'd
      const rsvp = await prisma.eventRsvp.findUnique({
        where: { eventId_studentId: { eventId: id, studentId: (await prisma.studentProfile.findUnique({ where: { userId: req.userId } }))?.id || '' } },
      });

      hasRsvped = !!rsvp;
    }

    return responses.ok(res, 'Event detail', {
      ...event,
      isEligible,
      hasRsvped,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/events
 * Create new event (admin/moderator only)
 */
export async function createEvent(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId || !['ADMIN', 'MODERATOR'].includes(req.role || '')) {
      return responses.forbidden(res, 'Only admins can create events');
    }

    const {
      title,
      description,
      eventDate,
      location,
      capacity,
      minCgpa,
      imageUrl,
      registrationLink,
    } = req.body;

    if (!title || !description || !eventDate || !location) {
      return responses.badRequest(res, 'Missing required fields');
    }

    const event = await prisma.campusEvent.create({
      data: {
        organizerId: userId,
        title,
        description,
        eventDate: new Date(eventDate),
        location,
        capacity: capacity ? parseInt(capacity) : null,
        minCgpa: minCgpa ? parseFloat(minCgpa) : null,
        imageUrl,
        registrationLink,
      },
      include: { organizer: { select: { name: true } } },
    });

    return responses.created(res, 'Event created', event);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/events/:id
 * Update event (organizer only)
 */
export async function updateEvent(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const event = await prisma.campusEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return responses.notFound(res, 'Event not found');
    }

    if (event.organizerId !== userId) {
      return responses.forbidden(res, 'Not event organizer');
    }

    const updated = await prisma.campusEvent.update({
      where: { id },
      data: {
        title: req.body.title || event.title,
        description: req.body.description || event.description,
        eventDate: req.body.eventDate ? new Date(req.body.eventDate) : event.eventDate,
        location: req.body.location || event.location,
        capacity: req.body.capacity ? parseInt(req.body.capacity) : event.capacity,
        minCgpa: req.body.minCgpa ? parseFloat(req.body.minCgpa) : event.minCgpa,
        imageUrl: req.body.imageUrl || event.imageUrl,
        registrationLink: req.body.registrationLink || event.registrationLink,
      },
    });

    return responses.ok(res, 'Event updated', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/events/:id
 * Delete event (organizer only)
 */
export async function deleteEvent(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const event = await prisma.campusEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return responses.notFound(res, 'Event not found');
    }

    if (event.organizerId !== userId) {
      return responses.forbidden(res);
    }

    await prisma.campusEvent.delete({ where: { id } });
    return responses.ok(res, 'Event deleted');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/events/:id/rsvp
 * RSVP to event or cancel RSVP
 */
export async function toggleEventRsvp(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true, cgpa: true },
    });

    if (!student) {
      return responses.notFound(res, 'Student not found');
    }

    const event = await prisma.campusEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return responses.notFound(res, 'Event not found');
    }

    // Check eligibility
    if (event.minCgpa && (!student.cgpa || student.cgpa < event.minCgpa)) {
      return responses.badRequest(res, `Minimum CGPA required: ${event.minCgpa}`);
    }

    // Check capacity
    if (event.capacity) {
      const rsvpCount = await prisma.eventRsvp.count({
        where: { eventId: id },
      });
      if (rsvpCount >= event.capacity) {
        return responses.badRequest(res, 'Event is full');
      }
    }

    const existing = await prisma.eventRsvp.findUnique({
      where: {
        eventId_studentId: { eventId: id, studentId: student.id },
      },
    });

    if (existing) {
      // Cancel RSVP
      await prisma.eventRsvp.delete({
        where: {
          eventId_studentId: { eventId: id, studentId: student.id },
        },
      });
      return responses.ok(res, 'RSVP cancelled');
    } else {
      // Create RSVP
      const rsvp = await prisma.eventRsvp.create({
        data: {
          eventId: id,
          studentId: student.id,
        },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId,
          type: 'EVENT_REMINDER',
          message: `You're registered for ${event.title}`,
          link: `/events/${id}`,
        },
      });

      return responses.ok(res, 'RSVP confirmed', rsvp);
    }
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/events/:id/rsvps
 * Get RSVPs for an event (organizer only)
 */
export async function getEventRsvps(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { page = 1, limit = 50 } = req.query;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const event = await prisma.campusEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return responses.notFound(res, 'Event not found');
    }

    if (event.organizerId !== userId) {
      return responses.forbidden(res);
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * pageSize;

    const [rsvps, total] = await Promise.all([
      prisma.eventRsvp.findMany({
        where: { eventId: id },
        include: {
          student: {
            select: {
              user: { select: { name: true, email: true } },
              cgpa: true,
              photoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.eventRsvp.count({ where: { eventId: id } }),
    ]);

    return responses.ok(res, 'Event RSVPs', {
      data: rsvps,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/events/:id/notify-eligible
 * Send bulk notification to eligible students
 */
export async function notifyEligibleStudents(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const event = await prisma.campusEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return responses.notFound(res, 'Event not found');
    }

    if (event.organizerId !== userId) {
      return responses.forbidden(res);
    }

    // Find eligible students
    const where: any = {};
    if (event.minCgpa) {
      where.cgpa = { gte: event.minCgpa };
    }

    const eligibleStudents = await prisma.studentProfile.findMany({
      where,
      include: { user: { select: { id: true, email: true } } },
    });

    // Create notifications for all eligible students
    const notifications = eligibleStudents.map((student) => ({
      userId: student.user.id,
      type: 'EVENT_NOTIFICATION' as const,
      message: `New event: ${event.title} on ${event.eventDate.toLocaleDateString()}`,
      link: `/events/${id}`,
      isRead: false,
      createdAt: new Date(),
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications,
      });
    }

    return responses.ok(res, 'Notifications sent', {
      count: notifications.length,
    });
  } catch (error) {
    next(error);
  }
}