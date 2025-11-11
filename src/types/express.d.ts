import * as multer from 'multer';

declare global {
  namespace Express {
    interface Request {
      file?: multer.File;
      user?: {
        id: string;
        email: string;
        name: string;
        publicKey?: string;
      };
    }
  }
}

export {};

