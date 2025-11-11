import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

let gridFsBucket: GridFSBucket | null = null;

export const getGridFSBucket = (): GridFSBucket => {
  if (!gridFsBucket) {
    const conn = mongoose.connection.db;
    if (!conn) {
      throw new Error('Database connection not established');
    }
    gridFsBucket = new GridFSBucket(conn, { bucketName: 'files' });
  }
  return gridFsBucket;
};

