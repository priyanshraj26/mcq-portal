# MCQ Test Portal

A full-stack web application for uploading PDF exam papers, parsing multiple-choice questions, configuring exam settings, taking timed exams, and viewing detailed performance analytics — with Google authentication and a dark-themed UI.

## Features

- **Google Authentication** - Sign in with Google via Clerk. Each user's exams, sessions, and results are fully isolated.
- **3-Layer PDF Parsing** - Upload one or more PDFs containing MCQs. The parser uses a three-layer pipeline: (1) regex algorithm, (2) pdfjs-dist positional analysis for low-confidence questions, (3) optional Gemini 2.5 Flash AI parsing for difficult PDFs. Each question shows which parser produced it.
- **40-Page PDF Support** - PDFs over 40 pages prompt you to select a page range. Client-side page count detection for instant feedback.
- **Question Review** - Preview parsed questions with confidence badges in a collapsible card UI. Edit, delete, or fix flagged questions before creating an exam.
- **Exam Configuration** - Set time limits (overall, per-section, per-question), scoring (marks per correct, negative marking), navigation rules, and question/option shuffling.
- **Exam Interface** - Full-featured exam UI with countdown timer, question navigation grid, section tabs, mark-for-review, built-in calculator, autosave, and back-button protection.
- **Performance Analysis** - Comprehensive post-exam analysis with score summary, section-wise breakdown, time analysis charts, and question-by-question review with filtering.
- **Dark/Light Theme** - Global theme toggle across all pages. Marketing pages are always dark; exam and product pages support both themes with localStorage persistence.
- **Cold Start Handling** - Friendly "Starting the server..." UI when the backend is waking up on Render's free tier.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite 7 |
| Styling | Tailwind CSS 4 + CSS Variables |
| State | Zustand |
| Charts | Recharts |
| Auth | Clerk (Google OAuth) |
| Backend | Node.js + Express 5 + TypeScript |
| Database | PostgreSQL (Neon) + Prisma ORM 7 |
| PDF Parsing | pdf-parse + pdfjs-dist + Gemini 2.5 Flash (3-layer) |
| Hosting | Vercel (frontend) + Render (backend) |

## Architecture

```
Browser
  |
  |-- GET /              -> Vercel (React SPA, static)
  |-- GET /test          -> Vercel (protected by Clerk)
  |
  |   Auth check         -> Clerk (JWT verification, Google OAuth)
  |
  |   API calls          -> Render (Node/Express)
  |                            |
  |                            |-- Parse PDF: Layer 1 (regex) + Layer 2 (pdfjs-dist)
  |                            |-- Optional: Layer 3 (Gemini 2.5 Flash AI)
  |                            |-- Read/write data -> Neon (PostgreSQL)
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Clerk](https://clerk.com) account (free tier)
- A [Neon](https://neon.tech) PostgreSQL database (free tier), or any PostgreSQL instance
- A [Google AI Studio](https://aistudio.google.com) API key (free tier, for AI parsing — optional)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/MCQ-portal.git
   cd MCQ-portal
   ```

2. **Backend setup**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database URL and Clerk keys
   npm install
   npx prisma migrate dev --name init
   npm run dev
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your Clerk publishable key
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

### Environment Variables

**Backend** (`backend/.env`):
```
DATABASE_URL=postgresql://user:password@localhost:5432/mcqportal
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=AIzaSy...
PORT=3001
```

**Frontend** (`frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:3001/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
```

## Usage

1. **Sign In** - Click "Start a Test" and sign in with your Google account
2. **Upload** - Drag and drop PDF files containing MCQs (40-page limit per PDF, page range selector for larger files)
3. **Review** - Check parsed questions, use AI Parser buttons for difficult PDFs, fix any flagged ones
4. **Configure** - Set timer, scoring, and navigation options
5. **Take Exam** - Answer questions with full exam controls
6. **Analyze** - Review detailed performance metrics and charts

## Deployment

The app is designed to deploy on free tiers:

- **Frontend** -> [Vercel](https://vercel.com) (set root directory to `frontend`)
- **Backend** -> [Render](https://render.com) (set root directory to `backend`, start command: `npm run start:migrate`)
- **Database** -> [Neon](https://neon.tech) (free PostgreSQL)

Add `GEMINI_API_KEY` to Render environment variables for AI parsing in production.

See `DEPLOY_AUTH_SPEC.md` for detailed deployment instructions.

### Keeping the Server Awake

Render's free tier sleeps after 15 minutes of inactivity. Set up [UptimeRobot](https://uptimerobot.com) to ping `https://your-backend.onrender.com/api/health` every 14 minutes.

## Project Structure

```
MCQ-portal/
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints (upload, exam, session, analysis)
│   │   ├── services/        # 3-layer PDF parsing (regex, pdfjs, Gemini AI), analysis engine
│   │   ├── middleware/       # Clerk auth middleware
│   │   ├── lib/             # Prisma client
│   │   └── prisma/          # Schema + migrations
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # Home, Dashboard, Upload, Configure, Exam, Analysis
│   │   ├── components/      # Marketing (Navbar, Footer, AnimatedCard, PixelCard),
│   │   │                    # Exam (NavigationGrid, TimerBar, Calculator),
│   │   │                    # Upload (QuestionPreview), Layouts, AuthInterceptor
│   │   ├── context/         # ThemeContext (global dark/light toggle)
│   │   ├── store/           # Zustand exam store
│   │   └── api/             # Axios client with Clerk token interceptor
│   └── package.json
└── README.md
```

## License

MIT
