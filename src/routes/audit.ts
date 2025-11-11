import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { verifyHash, getAuditLogs } from '../controllers/auditController';
import { getBlockchainStatus } from '../services/blockchain';

const router = Router();

// Get blockchain status (public endpoint for demo)
router.get('/status', async (req, res) => {
  try {
    const status = await getBlockchainStatus();
    return res.json(status);
  } catch (error) {
    return res.status(500).json({ connected: false, error: 'Failed to get status' });
  }
});

// All other routes require authentication
router.use(requireAuth);

// Verify a hash
router.get('/verify/:hash', verifyHash);

// Get audit logs for a workspace
router.get('/workspace/:workspaceId', getAuditLogs);

export default router;

