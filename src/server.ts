import express from "express";
import cors from 'cors';
import helmet from 'helment';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database';
import { config } from './config/env';

const app = express();

app.use(helmet());
app.use(compression());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

app.use(limiter);

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials:true,
}));

app.use(express.json({ limit: '10mb'}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(morgan('combined'));

app.get('/', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString()
    });

connectDB();

const PORT = config.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})
})

