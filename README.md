# NUBJobs â€” NUB Students Job & Internship Portal

> A modern, student-first job & internship platform for **Northern University Bangladesh**, purpose-built for campus recruitment, CGPA-aware matching, and AI-assisted applications â€” the things a general job board like BDJobs was never designed to do.

NUBJobs is a full-stack TypeScript monorepo: a **Next.js 16** client and an **Express + Prisma + PostgreSQL** API server, with role-based auth (Student / Employer / Admin), JWT access + refresh tokens, in-app messaging, notifications, campus events, and AI-powered job matching.

---

## ðŸ§± Tech Stack

### Frontend (`/client`)

| Layer | Technology | Version |
| --- | --- | --- |
| Framework | Next.js (App Router, Turbopack) | 16.3.3 |
| Language | TypeScript | 5.x |
| UI runtime | React | 19.2 |
| Styling | Tailwind CSS | v4 |
| Components | shadcn/ui (Radix base, `radix-nova`) | CLI v4 |
| Data fetching | TanStack Query | v5 |
| Forms | React Hook Form | v7 |
| Validation | Zod (+ `@hookform/resolvers`) | v4 |
| Icons | lucide-react | latest |

### Backend (`/server`)

| Layer | Technology | Version |
| --- | --- | --- |
| Runtime | Node.js | 18+ (built on 24) |
| Framework | Express | v5 |
| Language | TypeScript | 5.x |
| ORM | Prisma | **v6** (see note) |
| Database | PostgreSQL | 14+ |
| Validation | Zod | v4 |
| Auth | JWT (access + refresh) Â· bcryptjs | â€” |
| Security | helmet Â· cors Â· express-rate-limit | â€” |
| Uploads | multer Â· Cloudinary | â€” |
| Email | Resend | â€” |
| AI | Anthropic Claude API | â€” |

> **Prisma version note:** Prisma **7** removed the `url` field from the schema `datasource` block and now requires a driver adapter (or `accelerateUrl`) passed to the `PrismaClient` constructor. That is incompatible with this project's classic schema (`url = env("DATABASE_URL")`) and the plain `new PrismaClient()` usage in `server.ts`. The project is therefore pinned to the latest **Prisma 6.x**, which supports the schema and code as written. Both `prisma` (CLI) and `@prisma/client` are kept on the same 6.x version.

---

## ðŸ† Why NUBJobs beats BDJobs â€” 13-feature comparison

BDJobs is a great *general* job board for the whole country. NUBJobs is a *campus* platform â€” it knows what a university, a student, and a recruiter hiring from that university actually need.

| # | Feature | NUBJobs | BDJobs |
| --- | --- | :---: | :---: |
| 1 | AI-powered candidate â†” job **match score** | âœ… Built-in (`matchScore`) | âŒ |
| 2 | **CGPA-aware** eligibility filtering on jobs & events (`minCgpa`) | âœ… | âŒ |
| 3 | **University-targeted** postings (`targetUniversity`) | âœ… | âŒ |
| 4 | Rich **student profiles**: NUB ID, department, skills, projects, certifications | âœ… Structured JSON | âš ï¸ Basic CV only |
| 5 | **Internship-first** categories (Full-time / Part-time / Internship / Remote / Hybrid) | âœ… First-class | âš ï¸ Generic |
| 6 | **On-campus recruitment events** + student RSVP | âœ… (`CampusEvent` + `EventRsvp`) | âŒ |
| 7 | **Application pipeline** tracking (Applied â†’ Reviewed â†’ Shortlisted â†’ Interviewed â†’ Hired) | âœ… 6 stages | âš ï¸ Applied / Not |
| 8 | **Real-time in-app messaging** scoped to an application | âœ… | âŒ (email only) |
| 9 | **In-app notifications** center | âœ… | âš ï¸ Email digests |
| 10 | **Verified employers** with uploaded documents | âœ… | âš ï¸ Partial |
| 11 | **AI cover-letter & resume assistance** (Claude) | âœ… | âŒ |
| 12 | **OTP email verification** + JWT refresh-token sessions | âœ… | âš ï¸ Basic |
| 13 | **Free for students** â€” no premium wall on applying | âœ… | âŒ Freemium |

Legend: âœ… full Â· âš ï¸ partial/limited Â· âŒ none

---

## ðŸ“ Project structure

```
NUBJobs/
â”œâ”€â”€ client/                      # Next.js 16 frontend (App Router, src dir)
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ app/                 # routes, layout, globals.css
â”‚   â”‚   â””â”€â”€ lib/                 # utils.ts (cn helper)
â”‚   â”œâ”€â”€ components.json          # shadcn/ui config (radix-nova, CSS variables)
â”‚   â”œâ”€â”€ next.config.ts           # Turbopack root pinned to client
â”‚   â””â”€â”€ .env.local.example
â”‚
â”œâ”€â”€ server/                      # Express + Prisma API
â”‚   â”œâ”€â”€ prisma/
â”‚   â”‚   â””â”€â”€ schema.prisma        # User, Profiles, Job, Application, Message, â€¦
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ app.ts               # Express app (helmet, cors, morgan, /api/health)
â”‚   â”‚   â”œâ”€â”€ server.ts            # bootstrap: connect Prisma â†’ listen
â”‚   â”‚   â”œâ”€â”€ routes/              # auth, jobs, applications, profile, admin,
â”‚   â”‚   â”‚                        #   events, messages, notifications, ai
â”‚   â”‚   â”œâ”€â”€ controllers/         # one controller per route group
â”‚   â”‚   â”œâ”€â”€ services/            # auth, jobs, email, ai
â”‚   â”‚   â”œâ”€â”€ middleware/          # auth, validate, upload, rateLimit
â”‚   â”‚   â”œâ”€â”€ lib/                 # prisma, cloudinary, resend
â”‚   â”‚   â”œâ”€â”€ utils/               # jwt, password, response helpers
â”‚   â”‚   â””â”€â”€ types/               # express.d.ts (request augmentation)
â”‚   â”œâ”€â”€ nodemon.json
â”‚   â”œâ”€â”€ tsconfig.json
â”‚   â””â”€â”€ .env.example
â”‚
â”œâ”€â”€ package.json                 # root scripts (concurrently), dev tooling
â”œâ”€â”€ .gitignore
â””â”€â”€ README.md
```

---

## ðŸš€ Quick start

### Prerequisites

- **Node.js** 18+ (project built and tested on Node 24)
- **PostgreSQL** 14+ running locally or a hosted URL
- **npm** 9+

### 1. Install dependencies

This is a multi-package repo (not npm workspaces), so install in each package:

```bash
npm install                      # root dev tooling (concurrently, prettier, â€¦)
npm install --prefix server
npm install --prefix client
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
cp client/.env.local.example client/.env.local
```

Then edit `server/.env` and set at minimum a real `DATABASE_URL`, plus your `JWT_SECRET`, `JWT_REFRESH_SECRET`, and any provider keys (Cloudinary, Resend, Anthropic) you plan to use.

### 3. Set up the database

```bash
cd server
npx prisma migrate dev --name init   # creates tables from schema.prisma
npx prisma generate                  # (re)generate the typed client
```

> No database yet? Spin one up fast with Docker:
> ```bash
> docker run --name nubjobs-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=nubjobs -p 5432:5432 -d postgres:16
> ```
> then set `DATABASE_URL="postgresql://postgres:password@localhost:5432/nubjobs?schema=public"`.

### 4. Run both apps

From the repo root:

```bash
npm run dev
```

- API â†’ **http://localhost:5000**
- Web â†’ **http://localhost:3000**

Or run them individually: `npm run dev --prefix server` / `npm run dev --prefix client`.

### 5. Verify

```bash
curl http://localhost:5000/api/health
# { "status": "ok", "timestamp": "..." }
```

---

## ðŸ“œ Scripts

### Root

| Script | Description |
| --- | --- |
| `npm run dev` | Runs client + server together via `concurrently` |
| `npm run build` | Builds server (`tsc`) then client (`next build`) |
| `npm run lint` | Lints server (`tsc --noEmit`) then client (`eslint`) |

### Server (`/server`)

| Script | Description |
| --- | --- |
| `npm run dev` | Start with nodemon + ts-node (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server (`node dist/server.js`) |
| `npm run lint` | Type-check with `tsc --noEmit` |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run `prisma migrate dev` |
| `npm run prisma:seed:applications` | Seed demo employers, jobs and applications |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run test:cloudinary` | Verify Cloudinary credentials end-to-end |
| `npm run test:google-oauth` | Google OAuth service smoke test (state, consent URL, user upsert) |
| `npm run test:google-oauth:http` | Google OAuth live route checks (server must be running) |

### Client (`/client`)

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

---

## ðŸ” Environment variables

See [`server/.env.example`](server/.env.example) and [`client/.env.local.example`](client/.env.local.example) for the full list. Key server variables:

`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `CLOUDINARY_*`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `CLIENT_URL`, `PORT`, `NODE_ENV`.

### Cloudinary file uploads

Uploads go through Multer (memory storage) â†’ Cloudinary; the resulting `secure_url` is what gets stored in Postgres (`StudentProfile.photoUrl` / `resumeUrl`, `EmployerProfile.logoUrl` / `verificationDocument`).

```bash
# server/.env â€” values from Cloudinary Dashboard â†’ Product Environment â†’ API keys
CLOUDINARY_CLOUD_NAME="<your-cloud-name>"
CLOUDINARY_API_KEY="<your-api-key>"
CLOUDINARY_API_SECRET="<your-api-secret>"
# or a single connection string: CLOUDINARY_URL="cloudinary://<key>:<secret>@<cloud-name>"
```

Verify the credentials (uploads an image + a document, checks delivery, then cleans up):

```bash
cd server && npm run test:cloudinary
```

| Method | Endpoint | Auth | Field | Limits |
| --- | --- | --- | --- | --- |
| `POST` | `/api/profile/photo` | Student | `photo` | JPG/PNG/WEBP Â· 5MB |
| `DELETE` | `/api/profile/photo` | Student | â€” | â€” |
| `POST` | `/api/profile/resume` | Student | `resume` | PDF/DOC/DOCX Â· 5MB |
| `DELETE` | `/api/profile/resume` | Student | â€” | â€” |
| `POST` | `/api/employer/company/logo` (alias `/api/company/logo`) | Employer | `logo` | JPG/PNG/WEBP Â· 5MB |
| `DELETE` | `/api/employer/company/logo` (alias `/api/company/logo`) | Employer | â€” | â€” |
| `POST` | `/api/company/verification-document` | Employer | `document` | PDF/DOC/DOCX Â· 5MB |

Images are transformed on delivery (`q_auto,f_auto` + avatar/logo sizing); replacing a file deletes the previous asset from Cloudinary.

### Continue with Google (OAuth 2.0)

SDK-free authorization-code flow: the browser is redirected to Google, and the callback exchanges the `code`, reads the profile, upserts the user and hands a token pair back to the SPA (`/oauth/callback`). `state` is a base64url JSON blob carrying the role/intent (plus optional signup extras); it is re-validated server-side, so a tampered value can never escalate privileges.

```bash
# server/.env â€” Google Cloud Console â†’ APIs & Services â†’ Credentials â†’ OAuth client ID (Web application)
GOOGLE_CLIENT_ID="<your-client-id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<your-client-secret>"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"
```

The redirect URI in the Google client **must match `GOOGLE_CALLBACK_URL` exactly** (add the production URL as well when deploying). New Google users get `provider: "google"`, `isEmailVerified: true` and a random password; an existing email account is auto-linked instead of duplicated; a duplicate NUB ID on signup is dropped rather than blocking sign-in.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth/google` | Redirect to the Google consent screen (`?json=1` returns the URL instead) |
| `GET` | `/api/auth/google/callback` | Exchange the code, upsert the user, redirect to `CLIENT_URL/oauth/callback` |

Verify it without a browser (service-level, uses disposable accounts that are deleted afterwards):

```bash
cd server && npm run test:google-oauth        # state round-trip, consent URL, upsert/link/duplicate NUB ID
cd server && npm run test:google-oauth:http   # live routes (needs `npm run dev` running): redirects + error paths
```

---

## ðŸ-ºï¸ Data model at a glance

`User` (Student / Employer / Admin) â†’ `StudentProfile` / `EmployerProfile` â†’ `Job` â†’ `Application` (with scoped `Message` threads) â†’ `Notification`, `SavedJob`, `CampusEvent` + `EventRsvp`. See [`server/prisma/schema.prisma`](server/prisma/schema.prisma) for the full schema.

---

## ðŸ“„ License

ISC Â© NUBJobs

