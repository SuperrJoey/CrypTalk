import mongoose, { Schema, Document } from 'mongoose';

export interface AuditLogDocument extends Document {
  workspaceId: string;
  type: 'message' | 'file';
  entityId: string; // Message ID or File ID
  hash: string; // SHA-256 hash
  txHash?: string; // Blockchain transaction hash
  blockNumber?: number; // Block number where hash was stored
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    workspaceId: { type: String, required: true, index: true },
    type: { type: String, enum: ['message', 'file'], required: true },
    entityId: { type: String, required: true, index: true },
    hash: { type: String, required: true, index: true },
    txHash: { type: String },
    blockNumber: { type: Number },
    status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' }
  },
  { timestamps: true }
);

// Compound index for efficient queries
AuditLogSchema.index({ workspaceId: 1, createdAt: -1 });
AuditLogSchema.index({ entityId: 1, type: 1 });

export const AuditLog = mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);

