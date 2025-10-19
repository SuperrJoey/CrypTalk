import dotenv from 'dotenv';

dotenv.config();

export const config = {
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptalk',
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    NODE_ENV: process.env.NODE_ENV || 'development',
    POLYGON_RPC_URL: process.env.POLYGON_RPC_URL || 'https://polygon-mumbai.g.alchemy.com/v2/your-api-key',
    PRIVATE_KEY: process.env.PRIVATE_KEY || '',
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || ''
  };