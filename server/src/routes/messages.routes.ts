import { Router } from 'express';
import { z } from 'zod';
import {
  getConversations,
  getConversation,
  sendMessage,
  markMessageRead,
  deleteMessage,
} from '../controllers/messages.controller';
import { authenticate, validate } from '../middleware/auth.middleware';

const router = Router();

// Validation schemas
const sendMessageSchema = z.object({
  applicationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

// All message routes require authentication
router.use(authenticate);

router.get('/conversations', getConversations);
router.get('/conversation/:applicationId', getConversation);
router.post('/', validate(sendMessageSchema), sendMessage);
router.patch('/:id/read', markMessageRead);
router.delete('/:id', deleteMessage);

export default router;