import { Request, Response } from 'express';
import { Message } from '../models/Message';
import { Workspace } from '../models/Workspace';
import { createAuditLog } from './auditController';

// Save a new message
export async function createMessage(req: Request, res: Response) {
  try {
    const { workspaceId, ciphertextB64, ivB64, hash } = req.body || {};
    
    if (!workspaceId || !ciphertextB64 || !ivB64 || !hash) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // @ts-ignore
    const senderId = req.user.id;

    // Verify user is a member of the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isMember = workspace.members.some(m => m.userId === senderId) || workspace.ownerId === senderId;
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    const message = await Message.create({
      workspaceId,
      senderId,
      ciphertextB64,
      ivB64,
      hash
    });

    // Create audit log and store hash on blockchain (async)
    createAuditLog(workspaceId, 'message', message._id.toString(), hash).catch(console.error);

    return res.status(201).json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Get messages for a workspace (paginated)
export async function getMessages(req: Request, res: Response) {
  try {
    const { workspaceId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // @ts-ignore
    const userId = req.user.id;

    // Verify user is a member
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isMember = workspace.members.some(m => m.userId === userId) || workspace.ownerId === userId;
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    const messages = await Message.find({ workspaceId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Message.countDocuments({ workspaceId });

    return res.json({
      messages: messages.reverse(), // Reverse to get chronological order
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

