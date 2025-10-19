import mongoose from 'mongoose';
import { config } from './env';

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.MONGODB_URI);
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('DB connection error: ', error);
        process.exit(1);
    }
};

mongoose.connection.on('error', (err) => {
    console.error('mongodb error: ', err);
})