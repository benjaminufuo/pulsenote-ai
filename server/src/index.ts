import express from 'express';
import cors from 'cors';
import path from 'path';
import { ENV } from './config/env';
import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import meetingRoutes from './routes/meeting.routes';
import actionItemRoutes from './routes/actionItem.routes';
import searchRoutes from './routes/search.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();

// Enable CORS for frontend client
app.use(
  cors({
    origin: '*',
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded audio/video files statically
app.use('/uploads', express.static(ENV.UPLOADS_DIR));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'PulseNote AI Server', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/action-items', actionItemRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(ENV.PORT, () => {
  console.log(`PulseNote AI Backend running on http://localhost:${ENV.PORT}`);
});
