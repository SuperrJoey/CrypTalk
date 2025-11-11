import { Request, Response } from 'express';
import { File } from '../models/File';
import { Workspace } from '../models/Workspace';
import { getGridFSBucket } from '../config/gridfs';
import { ObjectId } from 'mongodb';
import { createAuditLog } from './auditController';

// Upload a file
export async function uploadFile(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { workspaceId, ivB64, hash, originalSize, originalFilename, contentType } = req.body || {};
    
    if (!workspaceId || !ivB64 || !hash || !originalSize || !originalFilename) {
      return res.status(400).json({ message: 'Missing required fields: workspaceId, ivB64, hash, originalSize, originalFilename' });
    }

    // @ts-ignore
    const uploaderId = req.user.id;

    // Verify user is a member of the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isMember = workspace.members.some(m => m.userId === uploaderId) || workspace.ownerId === uploaderId;
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    // Store file in GridFS
    const gridFsBucket = getGridFSBucket();
    const uploadStream = gridFsBucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: {
        workspaceId,
        uploaderId,
        ivB64,
        hash
      }
    });

    // Handle upload completion with promise
    const uploadPromise = new Promise<string>((resolve, reject) => {
      uploadStream.on('finish', () => {
        resolve(uploadStream.id.toString());
      });

      uploadStream.on('error', (error) => {
        reject(error);
      });
    });

    // Write file buffer to GridFS
    uploadStream.end(req.file.buffer);

    try {
      const gridFsId = await uploadPromise;

      // Save file metadata
      const fileDoc = await File.create({
        workspaceId,
        uploaderId,
        filename: originalFilename,
        originalFilename: originalFilename,
        contentType: contentType || req.file.mimetype || 'application/octet-stream',
        size: parseInt(originalSize), // Store original file size
        gridFsId,
        ivB64,
        hash
      });

      // Create audit log and store hash on blockchain (async)
      createAuditLog(workspaceId, 'file', String(fileDoc._id), hash).catch(console.error);

      return res.status(201).json(fileDoc);
    } catch (uploadError) {
      console.error('Error uploading file to GridFS:', uploadError);
      if (!res.headersSent) {
        return res.status(500).json({ message: 'Error uploading file' });
      }
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Get files for a workspace
export async function getFiles(req: Request, res: Response) {
  try {
    const { workspaceId } = req.params;
    
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

    const files = await File.find({ workspaceId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Download a file
export async function downloadFile(req: Request, res: Response) {
  try {
    const { fileId } = req.params;

    // @ts-ignore
    const userId = req.user.id;

    // Get file metadata
    const fileDoc = await File.findById(fileId);
    if (!fileDoc) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Verify user is a member of the workspace
    const workspace = await Workspace.findById(fileDoc.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isMember = workspace.members.some(m => m.userId === userId) || workspace.ownerId === userId;
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    // Get file from GridFS
    const gridFsBucket = getGridFSBucket();
    const downloadStream = gridFsBucket.openDownloadStream(new ObjectId(fileDoc.gridFsId));

    // Set response headers (before piping)
    res.setHeader('Content-Type', fileDoc.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileDoc.originalFilename}"`);
    res.setHeader('X-File-IV', fileDoc.ivB64); // Send IV for client-side decryption
    res.setHeader('X-File-Hash', fileDoc.hash); // Send hash for integrity verification
    // Allow CORS to read custom headers
    res.setHeader('Access-Control-Expose-Headers', 'X-File-IV, X-File-Hash');

    // Pipe file to response
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Error downloading file:', error);
      if (!res.headersSent) {
        return res.status(500).json({ message: 'Error downloading file' });
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Delete a file
export async function deleteFile(req: Request, res: Response) {
  try {
    const { fileId } = req.params;

    // @ts-ignore
    const userId = req.user.id;

    // Get file metadata
    const fileDoc = await File.findById(fileId);
    if (!fileDoc) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Verify user is the uploader or workspace owner
    const workspace = await Workspace.findById(fileDoc.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isOwner = workspace.ownerId === userId;
    const isUploader = fileDoc.uploaderId === userId;
    if (!isOwner && !isUploader) {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }

    // Delete from GridFS
    const gridFsBucket = getGridFSBucket();
    await gridFsBucket.delete(new ObjectId(fileDoc.gridFsId));

    // Delete metadata
    await File.findByIdAndDelete(fileId);

    return res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

