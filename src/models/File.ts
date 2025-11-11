import mongoose, { Schema, Document } from 'mongoose';

export interface FileDocument extends Document {
  workspaceId: string;
  uploaderId: string;
  filename: string;
  originalFilename: string;
  contentType: string;
  size: number;
  gridFsId: string; // GridFS file ID
  ivB64: string; // Initialization vector for decryption
  hash: string; // SHA-256 hash for integrity verification
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema<FileDocument>(
  {
    workspaceId: { type: String, required: true, index: true },
    uploaderId: { type: String, required: true, index: true },
    filename: { type: String, required: true },
    originalFilename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    gridFsId: { type: String, required: true, unique: true },
    ivB64: { type: String, required: true },
    hash: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

// Compound index for efficient workspace file queries
FileSchema.index({ workspaceId: 1, createdAt: -1 });

export const File = mongoose.model<FileDocument>('File', FileSchema);

