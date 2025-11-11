import mongoose from 'mongoose';
import { config } from './env';

export const connectDB = async (): Promise<void> => {
    try {
        const conn = await mongoose.connect(config.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`MongoDB Connected: host=${conn.connection.host} db=${conn.connection.name}`)
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
});