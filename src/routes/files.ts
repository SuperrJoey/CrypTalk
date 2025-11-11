import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadFile, getFiles, downloadFile, deleteFile } from '../controllers/fileController';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Upload a file
router.post('/upload', upload.single('file'), uploadFile);

// Get files for a workspace
router.get('/workspace/:workspaceId', getFiles);

// Download a file
router.get('/:fileId', downloadFile);

// Delete a file
router.delete('/:fileId', deleteFile);

export default router;

