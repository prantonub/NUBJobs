import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'

// Import routes
import jobsRoutes from './routes/jobs.routes'
import applicationsRoutes from './routes/applications.routes'
import profileRoutes from './routes/profile.routes'

//new file
import authRoutes from './routes/auth.routes'
import employerRoutes from './routes/employer.routes'
import jobPostingRoutes from './routes/job-posting.routes'
import companyProfileRoutes from './routes/company-profile.routes'

const app = express()

// Middleware
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }))

// Routes
app.use('/api/jobs', jobsRoutes)
app.use('/api/applications', applicationsRoutes)
app.use('/api/profile', profileRoutes)

//new file
app.use('/api/auth', authRoutes)
app.use('/api/employer', employerRoutes)
app.use('/api/employer/jobs', jobPostingRoutes)
app.use('/api/company', companyProfileRoutes)

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

export default app