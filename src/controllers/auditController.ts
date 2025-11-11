import { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog';
import { storeHashOnChain, verifyHashOnChain } from '../services/blockchain';

// Store hash on blockchain (called when message/file is created)
export async function createAuditLog(
  workspaceId: string,
  type: 'message' | 'file',
  entityId: string,
  hash: string
): Promise<void> {
  try {
    // Create audit log entry
    const auditLog = await AuditLog.create({
      workspaceId,
      type,
      entityId,
      hash,
      status: 'pending'
    });

    // Store hash on blockchain (async, don't wait)
    storeHashOnChain(hash, type, entityId)
      .then(async (result) => {
        await AuditLog.findByIdAndUpdate(auditLog._id, {
          txHash: result.txHash,
          blockNumber: result.blockNumber,
          status: result.status as 'pending' | 'confirmed' | 'failed'
        });
        console.log('Blockchain: Audit log updated:', auditLog._id, result.status);
      })
      .catch((error) => {
        console.error('Blockchain: Failed to store hash:', error);
        AuditLog.findByIdAndUpdate(auditLog._id, { status: 'failed' }).catch(console.error);
      });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}

// Verify hash endpoint
export async function verifyHash(req: Request, res: Response) {
  try {
    const { hash } = req.params;

    if (!hash || hash.length !== 64) {
      return res.status(400).json({ message: 'Invalid hash format' });
    }

    // Check database first
    const auditLog = await AuditLog.findOne({ hash }).lean();
    if (!auditLog) {
      return res.status(404).json({ message: 'Hash not found in audit log' });
    }

    // Verify on blockchain
    const verification = await verifyHashOnChain(hash);

    return res.json({
      hash,
      verified: verification.verified,
      auditLog: {
        workspaceId: auditLog.workspaceId,
        type: auditLog.type,
        entityId: auditLog.entityId,
        status: auditLog.status,
        txHash: auditLog.txHash,
        blockNumber: auditLog.blockNumber,
        createdAt: auditLog.createdAt
      },
      blockchain: {
        verified: verification.verified,
        txHash: verification.txHash,
        blockNumber: verification.blockNumber
      }
    });
  } catch (error) {
    console.error('Error verifying hash:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Get audit logs for a workspace
export async function getAuditLogs(req: Request, res: Response) {
  try {
    const { workspaceId } = req.params;
    
    // @ts-ignore
    const userId = req.user.id;

    // Verify user has access (you might want to check workspace membership)
    const logs = await AuditLog.find({ workspaceId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

