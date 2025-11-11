import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Workspace } from '../models/Workspace';
import { generateInviteCode } from '../utils/code';

const router = Router();

// Create a workspace (adds owner as member, generates code)
router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'Name required' });
  // @ts-ignore
  const ownerId = req.user.id;
  const inviteCode = generateInviteCode();
  const ws = await Workspace.create({
    name: String(name).trim(),
    ownerId,
    members: [{ userId: ownerId, role: 'owner' }],
    inviteCode
  });
  return res.status(201).json(ws);
});

// List my workspaces (owner or member)
router.get('/', requireAuth, async (req, res) => {
  // @ts-ignore
  const userId = req.user.id;
  const list = await Workspace.find({
    $or: [{ ownerId: userId }, { 'members.userId': userId }]
  }).sort({ createdAt: -1 }).lean();
  return res.json(list);
});

// Join by invite code
router.post('/join', requireAuth, async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ message: 'Code required' });
  // @ts-ignore
  const userId = req.user.id;

  const ws = await Workspace.findOne({ inviteCode: String(code).toUpperCase() });
  if (!ws) return res.status(404).json({ message: 'Invalid code' });

  const already = ws.members.some(m => m.userId === userId);
  if (!already) {
    ws.members.push({ userId, role: 'member' });
    await ws.save();
  }
  return res.json(ws);
});

// (Optional) Rotate invite code — owner only
router.post('/:id/rotate-code', requireAuth, async (req, res) => {
  // @ts-ignore
  const userId = req.user.id;
  const ws = await Workspace.findById(req.params.id);
  if (!ws) return res.status(404).json({ message: 'Not found' });
  if (ws.ownerId !== userId) return res.status(403).json({ message: 'Forbidden' });
  ws.inviteCode = generateInviteCode();
  await ws.save();
  return res.json({ inviteCode: ws.inviteCode });
});

export default router;