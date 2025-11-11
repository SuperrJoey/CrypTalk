import mongoose, { Schema, Document } from 'mongoose';

export interface WorkspaceMember { userId: string; role: 'owner'|'member'; }
export interface WorkspaceDocument extends Document {
  name: string;
  ownerId: string;
  members: WorkspaceMember[];
  inviteCode: string; // short code to join
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<WorkspaceDocument>(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: String, required: true, index: true },
    members: { type: [{ userId: String, role: String }], default: [] },
    inviteCode: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

export const Workspace = mongoose.model<WorkspaceDocument>('Workspace', WorkspaceSchema);