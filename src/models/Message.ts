import mongoose, { Schema, Document } from 'mongoose';

export interface MessageDocument extends Document {
  workspaceId: string;
  senderId: string;
  ciphertextB64: string; // Encrypted message
  ivB64: string; // Initialization vector for decryption
  hash: string; // SHA-256 hash for integrity verification
  createdAt: Date;
}

const MessageSchema = new Schema<MessageDocument>(
  {
    workspaceId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    ciphertextB64: { type: String, required: true },
    ivB64: { type: String, required: true },
    hash: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

// Compound index for efficient workspace message queries
MessageSchema.index({ workspaceId: 1, createdAt: -1 });

export const Message = mongoose.model<MessageDocument>('Message', MessageSchema);

