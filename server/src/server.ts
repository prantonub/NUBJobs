
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { initializeSocket } from './lib/socket-server';

// Routes
import authRoutes from './routes/auth.routes';
import jobsRoutes from './routes/jobs-enhanced.routes';
import applicationsRoutes from './routes/applications-enhanced.routes';
import profileRoutes from './routes/profile-public.routes';
import notificationsRoutes from './routes/notifications.routes';
import messagesRoutes from './routes/messages.routes';
import employerRoutes from './routes/employer.routes';
import jobPostingRoutes from './routes/job-posting.routes';
import companyProfileRoutes from './routes/company-profile.routes';
import eventsRoutes from './routes/events.routes';
import aiRoutes from './routes/ai-features.routes';
import adminRoutes from './routes/admin.routes';
import companiesRoutes from './routes/companies.routes';

const app: Express = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server running', timestamp: new Date() });
});

// API Routes
const apiPrefix = '/api';

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/jobs`, jobsRoutes);
app.use(`${apiPrefix}/applications`, applicationsRoutes);
app.use(`${apiPrefix}/profile`, profileRoutes);
app.use(`${apiPrefix}/notifications`, notificationsRoutes);
app.use(`${apiPrefix}/messages`, messagesRoutes);
app.use(`${apiPrefix}/employer`, employerRoutes);
app.use(`${apiPrefix}/employer/jobs`, jobPostingRoutes);
app.use(`${apiPrefix}/company`, companyProfileRoutes);
app.use(`${apiPrefix}/events`, eventsRoutes);
app.use(`${apiPrefix}/ai`, aiRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);
app.use(`${apiPrefix}/companies`, companiesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
});

// Initialize Socket.io with HTTP server
const { httpServer, io } = initializeSocket(app);

// Start server
httpServer.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🔗 WebSocket enabled for real-time messaging`);
  console.log(`📡 API prefix: ${apiPrefix}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;