# NUBJobs Frontend — Complete Setup Guide

This is the **production-ready frontend** for NUBJobs, built with React 18, Vite, and Tailwind CSS v4.

## What's Included

✅ **15+ Complete Pages** — all styled per design system
✅ **Responsive Design** — works on mobile, tablet, desktop
✅ **Dark Mode** — toggle in navbar
✅ **Mock Data** — full sample data for jobs, users, applications
✅ **Context API** — Auth state management
✅ **Reusable Components** — Button, Card, Input, Modal, Badge, Skeleton, etc.
✅ **No Backend Required** — runs standalone with mock data

## Pages Built

### Public Pages
- `Home` — hero, features, comparison table, CTA
- `Login` — email/password auth mock
- `Register` — sign up with role selection
- `JobListing` — browse jobs with filters
- `JobDetail` — full job description and apply

### Student Pages (protected)
- `StudentDashboard` — overview, stats, recommended jobs, feature cards
- `MyApplications` — track application status with timeline
- `StudentProfileEdit` — build profile with CGPA, skills, education
- `ApplyToJob` — cover letter (with AI generation demo)
- `ResumeAnalysis` — AI-powered resume scoring demo
- `MockInterview` — practice with AI scoring
- `CampusEvents` — RSVP to recruitment events
- `ChatPage` — real-time messaging (mock)

### Employer Pages (protected)
- `EmployerDashboard` — stats, Kanban board, applications
- `PostJob` — create job listings
- `EmployerProfileEdit` — company profile

### Admin Pages (protected)
- `AdminDashboard` — analytics, user/job tables, management

## Setup Instructions

### 1. Install Dependencies
```bash
cd client
npm install
```
All deps are already in package.json:
- `react` 18
- `react-router-dom` v6
- `lucide-react` — icons
- `tailwindcss` v4

### 2. Run Dev Server
```bash
npm run dev
```
Opens at `http://localhost:5173`

### 3. Build for Production
```bash
npm run build
```
Output goes to `dist/`

## Architecture

```
src/
├── components/
│   ├── common/        # Navbar, Footer, Sidebar, Theme
│   ├── ui/            # Button, Card, Input, Modal, Badge, Skeleton, LoadingSpinner
│   └── job/           # JobCard, JobFilters, KanbanBoard, ChatBox
├── pages/             # All 18 pages
├── context/           # AuthContext, ThemeContext
├── hooks/             # useAuth, useTheme
├── services/          # api.js (stub for backend calls)
├── utils/             # formatters, validators
├── App.jsx            # Routes + providers
└── index.css          # Tailwind
```

## Key Features

### Authentication Context
- Manages user state (logged in / logged out)
- Provides `login`, `logout`, `register` functions
- Stores token in memory (no localStorage initially)
- Mock auth — any email/password works

### Theme Context
- Toggle between light/dark modes
- Persists in React state
- Applies `dark` class to `<html>`
- All components use `dark:` prefix for dark mode

### Protected Routes
- `<ProtectedRoute>` wraps protected pages
- Redirects to `/login` if not authenticated
- Can restrict by role (student/employer/admin)

### Mock Data
- Jobs, users, applications, events
- Located inline in components or pages
- Replace with API calls when backend is ready
- Search/filter fully functional on mock data

## Design System Applied

- **Colors**: #2563EB (primary), #7C3AED (accent), semantic greens/reds/ambers
- **Typography**: Inter font, 4 weights, proper hierarchy
- **Spacing**: 4px grid, consistent margins/padding
- **Components**: All follow specs (Button sizes, Card shadows, Badge colors)
- **Animations**: 150-300ms transitions, smooth scale/fade
- **Dark Mode**: Automatic inverse colors everywhere with `dark:` prefix

## Next Steps: Wire Backend

To connect to the real backend:

1. Update `src/services/api.js`:
   - Change `API_BASE` from `localhost:5000` to your backend URL
   - Import functions in pages and use `useQuery` (from TanStack Query)

2. Install TanStack Query:
   ```bash
   npm install @tanstack/react-query
   ```

3. Replace mock data with API calls:
   ```javascript
   // Before (mock):
   const MOCK_JOBS = [{ ... }];
   
   // After (API):
   const { data: jobs } = useQuery(['jobs'], () => jobAPI.getAll());
   ```

4. Update form submissions:
   ```javascript
   // Before (mock):
   navigate('/student-dashboard');
   
   // After (API):
   await login(email, password);
   navigate('/student-dashboard');
   ```

## Testing

Click through:
1. **Home** → all sections load
2. **Register** → create account (mock accepts any email/password 8+ chars)
3. **Student Dashboard** → see stats, cards, recommended jobs
4. **Job Listing** → filters work, cards clickable
5. **Job Detail** → eligibility badge updates based on CGPA
6. **Apply** → AI cover letter demo, form validation
7. **Resume Analysis** → loading state, AI scoring (demo)
8. **Mock Interview** → multi-step flow, scoring
9. **Dark Mode** → toggle in navbar, entire app switches
10. **Mobile** → resize to 375px width, responsive layout

## Troubleshooting

**Pages not loading?**
→ Check browser console for errors
→ Ensure all imports are correct
→ Verify React Router is installed

**Dark mode not working?**
→ Check that `ThemeProvider` wraps the app
→ Ensure Tailwind CSS is processing `dark:` prefix

**Styles look wrong?**
→ Run `npm run dev` (dev server rebuilds CSS)
→ Clear browser cache
→ Check that `vite.config.js` has `@tailwindcss/vite` plugin

**Mock data not showing?**
→ Check component for `MOCK_JOBS` or similar constant
→ Ensure component uses correct state/props

## File Structure Checklist

All files should exist:
```
✅ src/
  ✅ components/
    ✅ common/ (Navbar, Footer, Sidebar, ThemeToggle, ProtectedRoute)
    ✅ ui/ (Button, Card, Input, Badge, Modal, Skeleton, LoadingSpinner)
    ✅ job/ (JobCard, JobFilters, KanbanBoard, ChatBox)
  ✅ pages/ (18 pages listed above)
  ✅ context/ (AuthContext, ThemeContext)
  ✅ hooks/ (useAuth, useTheme)
  ✅ services/ (api.js)
  ✅ utils/ (formatters, validators)
  ✅ App.jsx
  ✅ main.jsx
  ✅ index.css
```

## Deployment

To deploy to Vercel:

1. Push repo to GitHub
2. Connect Vercel to GitHub repo
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add env vars (if needed for backend URL)
6. Deploy

Vercel auto-deploys on push to main branch.

## Support

If something breaks:
1. Check console for errors
2. Verify file paths match the structure above
3. Ensure all npm packages are installed
4. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
5. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

---

**Your frontend is ready to use!** Register, log in, explore all pages. When you're ready to connect the backend, update the API calls and you're done.
