import multer from 'multer';

// Configure multer for in-memory storage (for GridFS)
const storage = multer.memoryStorage();

// File filter - accept all file types for demo
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // For demo, accept all files
  // In production, you might want to restrict file types
  cb(null, true);
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for demo
  }
});

