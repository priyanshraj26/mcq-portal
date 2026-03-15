# MCQ Test Portal

A full-stack web application for uploading PDF exam papers, parsing multiple-choice questions, configuring exam settings, taking timed exams, and viewing detailed performance analytics.

## Features

- **PDF Upload & Parsing** - Upload one or more PDFs containing MCQs. The parser auto-detects multiple question formats (numbered, inline, tabular, answer-key-at-end) and extracts questions with confidence scoring.
- **Question Review** - Preview parsed questions with confidence badges. Edit, delete, or fix flagged questions before creating an exam.
- **Exam Configuration** - Set time limits (overall, per-section, per-question), scoring (marks per correct, negative marking), navigation rules, and question/option shuffling.
- **Exam Interface** - Full-featured exam UI with countdown timer, question navigation grid, section tabs, mark-for-review, built-in calculator, and autosave.
- **Performance Analysis** - Comprehensive post-exam analysis with score summary, section-wise breakdown, time analysis charts, and question-by-question review with filtering.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite 7 |
| Styling | Tailwind CSS 4 |
| State | Zustand |
| Charts | Recharts |
| Backend | Node.js + Express 5 + TypeScript |
| Database | PostgreSQL + Prisma ORM 7 |
| PDF Parsing | pdf-parse |
| File Uploads | Multer |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+

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
   # Edit .env with your PostgreSQL credentials
   npm install
   npx prisma migrate dev --name init
   npm run dev
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

### Environment Variables

**Backend** (`.env`):
```
DATABASE_URL=postgresql://user:password@localhost:5432/mcqportal
PORT=3001
MAX_FILE_SIZE_MB=50
UPLOAD_DIR="./uploads"
```

**Frontend** (`.env`):
```
VITE_API_BASE_URL="http://localhost:3001/api"
```

## Usage

1. **Upload** - Drag and drop PDF files containing MCQs
2. **Review** - Check parsed questions, fix any flagged ones
3. **Configure** - Set timer, scoring, and navigation options
4. **Take Exam** - Answer questions with full exam controls
5. **Analyze** - Review detailed performance metrics and charts

## Screenshots

*Coming soon*

## License

MIT
