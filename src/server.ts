import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database';
import { config } from './config/env';
import authRoutes from './routes/auth';
import http from 'http';
import { Server } from 'socket.io';
import workspaceRoutes from './routes/workspaces';
import messageRoutes from './routes/messages';
import fileRoutes from './routes/files';
import auditRoutes from './routes/audit';
import { Workspace } from './models/Workspace';
import { Message } from './models/Message';
import { initBlockchain } from './services/blockchain';


const app = express();
const httpServer = http.createServer(app);



// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    exposedHeaders: ['X-File-IV', 'X-File-Hash'] // Expose custom headers for file download
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/workspaces', workspaceRoutes);
app.use('/messages', messageRoutes);
app.use('/files', fileRoutes);
app.use('/audit', auditRoutes);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket) => {
    socket.on('room:join', async ({ workspaceId, userId }) => {
      if (!workspaceId || !userId) return;
      const ws = await Workspace.findById(workspaceId).select('members');
      const isMember = ws?.members?.some(m => m.userId === userId);
      if (!isMember) return; // silently ignore for demo
      socket.join(`workspace:${workspaceId}`);
    });
  
  socket.on('chat:message', async (payload) => {
      if (!payload?.workspaceId || !payload?.ciphertextB64 || !payload?.ivB64 || !payload?.hash) return;
      
      // Note: Message is already saved via API endpoint (/messages POST)
      // Socket handler only broadcasts to other users in the room
      // This prevents duplicate saves (API saves once, socket only broadcasts)
      
      // Broadcast to others in the room (exclude sender) to avoid duplicate on sender
      socket.to(`workspace:${payload.workspaceId}`).emit('chat:message', payload);
    });
  });
// Connect to database and initialize blockchain
connectDB().then(() => {
  // Initialize blockchain after DB connection
  initBlockchain();
});

httpServer.listen(config.PORT || 5000, () => {
  console.log(`Server running on port ${config.PORT || 5000}`);
});