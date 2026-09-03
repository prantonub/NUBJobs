# NUBJobs — NUB Students Job & Internship Portal

> A modern, student-first job & internship platform for **Northern University Bangladesh**, purpose-built for campus recruitment, CGPA-aware matching, and AI-assisted applications — the things a general job board like BDJobs was never designed to do.

NUBJobs is a full-stack TypeScript monorepo: a **Next.js 16** client and an **Express + Prisma + PostgreSQL** API server, with role-based auth (Student / Employer / Admin), JWT access + refresh tokens, in-app messaging, notifications, campus events, and AI-powered job matching.

---

## 🧱 Tech Stack

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
| Auth | JWT (access + refresh) · bcryptjs | — |
| Security | helmet · cors · express-rate-limit | — |
| Uploads | multer · Cloudinary | — |
| Email | Resend | — |
| AI | Anthropic Claude API | — |

> **Prisma version note:** Prisma **7** removed the `url` field from the schema `datasource` block and now requires a driver adapter (or `accelerateUrl`) passed to the `PrismaClient` constructor. That is incompatible with this project's classic schema (`url = env("DATABASE_URL")`) and the plain `new PrismaClient()` usage in `server.ts`. The project is therefore pinned to the latest **Prisma 6.x**, which supports the schema and code as written. Both `prisma` (CLI) and `@prisma/client` are kept on the same 6.x version.

---

## 🏆 Why NUBJobs beats BDJobs — 13-feature comparison

BDJobs is a great *general* job board for the whole country. NUBJobs is a *campus* platform — it knows what a university, a student, and a recruiter hiring from that university actually need.

| # | Feature | NUBJobs | BDJobs |
| --- | --- | :---: | :---: |
| 1 | AI-powered candidate ↔ job **match score** | ✅ Built-in (`matchScore`) | ❌ |
| 2 | **CGPA-aware** eligibility filtering on jobs & events (`minCgpa`) | ✅ | ❌ |
| 3 | **University-targeted** postings (`targetUniversity`) | ✅ | ❌ |
| 4 | Rich **student profiles**: NUB ID, department, skills, projects, certifications | ✅ Structured JSON | ⚠️ Basic CV only |
| 5 | **Internship-first** categories (Full-time / Part-time / Internship / Remote / Hybrid) | ✅ First-class | ⚠️ Generic |
| 6 | **On-campus recruitment events** + student RSVP | ✅ (`CampusEvent` + `EventRsvp`) | ❌ |
| 7 | **Application pipeline** tracking (Applied → Reviewed → Shortlisted → Interviewed → Hired) | ✅ 6 stages | ⚠️ Applied / Not |
| 8 | **Real-time in-app messaging** scoped to an application | ✅ | ❌ (email only) |
| 9 | **In-app notifications** center | ✅ | ⚠️ Email digests |
| 10 | **Verified employers** with uploaded documents | ✅ | ⚠️ Partial |
| 11 | **AI cover-letter & resume assistance** (Claude) | ✅ | ❌ |
| 12 | **OTP email verification** + JWT refresh-token sessions | ✅ | ⚠️ Basic |
| 13 | **Free for students** — no premium wall on applying | ✅ | ❌ Freemium |

Legend: ✅ full · ⚠️ partial/limited · ❌ none

---

## 📁 Project structure

```
NUBJobs/
├── client/                      # Next.js 16 frontend (App Router, src dir)
│   ├── src/
│   │   ├── app/                 # routes, layout, globals.css
│   │   └── lib/                 # utils.ts (cn helper)
│   ├── components.json          # shadcn/ui config (radix-nova, CSS variables)
│   ├── next.config.ts           # Turbopack root pinned to client
│   └── .env.local.example
│
├── server/                      # Express + Prisma API
│   ├── prisma/
│   │   └── schema.prisma        # User, Profiles, Job, Application, Message, …
│   ├── src/
│   │   ├── app.ts               # Express app (helmet, cors, morgan, /api/health)
│   │   ├── server.ts            # bootstrap: connect Prisma → listen
│   │   ├── routes/              # auth, jobs, applications, profile, admin,
│   │   │                        #   events, messages, notifications, ai
│   │   ├── controllers/         # one controller per route group
│   │   ├── services/            # auth, jobs, email, ai
│   │   ├── middleware/          # auth, validate, upload, rateLimit
│   │   ├── lib/                 # prisma, cloudinary, resend
│   │   ├── utils/               # jwt, password, response helpers
│   │   └── types/               # express.d.ts (request augmentation)
│   ├── nodemon.json
│   ├── tsconfig.json
│   └── .env.example
│
├── package.json                 # root scripts (concurrently), dev tooling
├── .gitignore
└── README.md
```

---

## 🚀 Quick start

### Prerequisites

- **Node.js** 18+ (project built and tested on Node 24)
- **PostgreSQL** 14+ running locally or a hosted URL
- **npm** 9+

### 1. Install dependencies

This is a multi-package repo (not npm workspaces), so install in each package:

```bash
npm install                      # root dev tooling (concurrently, prettier, …)
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

- API → **http://localhost:5000**
- Web → **http://localhost:3000**

Or run them individually: `npm run dev --prefix server` / `npm run dev --prefix client`.

### 5. Verify

```bash
curl http://localhost:5000/api/health
# { "status": "ok", "timestamp": "..." }
```

---

## 📜 Scripts

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
| `npm run prisma:studio` | Open Prisma Studio |

### Client (`/client`)

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

---

## 🔐 Environment variables

See [`server/.env.example`](server/.env.example) and [`client/.env.local.example`](client/.env.local.example) for the full list. Key server variables:

`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `CLOUDINARY_*`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `CLIENT_URL`, `PORT`, `NODE_ENV`.

---

## 🗺️ Data model at a glance

`User` (Student / Employer / Admin) → `StudentProfile` / `EmployerProfile` → `Job` → `Application` (with scoped `Message` threads) → `Notification`, `SavedJob`, `CampusEvent` + `EventRsvp`. See [`server/prisma/schema.prisma`](server/prisma/schema.prisma) for the full schema.

---

## 📄 License

ISC © NUBJobs
