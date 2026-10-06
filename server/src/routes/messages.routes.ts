import { Router } from 'express';
import { z } from 'zod';
import {
  getConversations,
  getConversation,
  sendMessage,
  sendDirectMessage,
  markMessageRead,
  markConversationRead,
  deleteMessage,
  searchMessages,
  archiveConversation,
  unarchiveConversation,
  pinConversation,
  getUnreadCount,
  emitTypingIndicator,
  blockUser,
  unblockUser,
  getBlockedUsers,
  searchRecipients,
} from '../controllers/messages.controller';
import { authenticate, validate } from '../middleware/auth.middleware';

const router = Router();

// Validation schemas
// Legacy application-scoped send (ApplicationChat) — applicationId + content.
const sendMessageSchema = z.object({
  applicationId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

// Spec §3 send — recipientId (+ optional jobId). applicationId allowed too so
// the same schema can front both routes (processSend branches on it).
const sendDirectSchema = z.object({
  recipientId: z.string().min(1).optional(),
  applicationId: z.string().min(1).optional(),
  jobId: z.string().min(1).optional(),
  content: z.string().min(1).max(5000),
});

const pinSchema = z.object({
  isPinned: z.boolean().optional(),
});

// All message routes require authentication
router.use(authenticate);

// ── Spec endpoints (static paths before /:messageId-style params) ──────────
router.get('/conversations', getConversations); // 1
router.get('/search', searchMessages); // 7
router.get('/unread-count', getUnreadCount); // 11
router.get('/blocked', getBlockedUsers); // 15
router.get('/recipients', searchRecipients); // aux: auto-complete for /messages/new
router.get('/typing/:userId', emitTypingIndicator); // 12

router.post('/send', validate(sendDirectSchema), sendDirectMessage); // 3
router.post('/block/:userId', blockUser); // 13
router.delete('/block/:userId', unblockUser); // 14

// Conversation-scoped ops (param name is a USER id — see route 2)
router.get('/conversation/:userId', getConversation); // 2
router.patch('/conversation/:userId/read-all', markConversationRead); // 5
router.patch('/conversation/:userId/archive', archiveConversation); // 8
router.patch('/conversation/:userId/unarchive', unarchiveConversation); // 9
router.patch('/conversation/:userId/pin', validate(pinSchema), pinConversation); // 10

// ── Legacy routes kept for ApplicationChat / older clients ────────────────
router.post('/', validate(sendMessageSchema), sendMessage);
router.patch('/:messageId/read', markMessageRead); // 4 (also spec)
router.delete('/:messageId', deleteMessage); // 6 (also spec)

export default router;