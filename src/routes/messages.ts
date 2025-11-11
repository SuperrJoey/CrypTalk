import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createMessage, getMessages } from '../controllers/messageController';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Create a new message
router.post('/', createMessage);

// Get messages for a workspace
router.get('/workspace/:workspaceId', getMessages);

export default router;

