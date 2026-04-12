# ICP Finder

AI-powered tool that searches across multiple platforms to find people matching your Ideal Customer Profile.

## Live

- **Frontend**: https://incubator-icp.vercel.app
- **Backend API**: https://icp-finder-api-production.up.railway.app

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python) + Claude Agent SDK
- **Deployment**: Vercel (frontend) + Railway (backend)

## How It Works

1. Describe your ideal customer profile in the text box
2. Select which platforms to search (LinkedIn, X/Twitter, Reddit, Hacker News, Indie Hackers)
3. Click "Find ICPs" — the backend launches AI agents to search each platform
4. Results appear in real-time as each platform completes
5. Export results as CSV

The backend uses Claude agents with web search capabilities to find real people matching your ICP description across 7 platforms. Each platform has a specialized search strategy.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/search` | Start an ICP search job |
| GET | `/jobs/{job_id}` | Poll job status and results |
| GET | `/health` | Health check |

### POST /search

```json
{
  "icp_description": "Solo technical founders building B2B SaaS...",
  "user_id": "user123",
  "platforms": ["Reddit", "X/Twitter", "LinkedIn", "Hacker News", "Indie Hackers"]
}
```

Returns `{ "job_id": "uuid" }`. Poll `/jobs/{job_id}` for progress and results.

## Local Development

### Frontend

```bash
npm install
npm run dev
# http://localhost:3000
```

### Backend

```bash
cd backend
cp .env.example .env
# Fill in ANTHROPIC_API_KEY in .env
pip install -r requirements.txt
python3 -m uvicorn server:app --reload --port 8000
# http://localhost:8000
```

### Environment Variables

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_ICP_API_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```
ANTHROPIC_API_KEY=sk-ant-...
ALLOWED_ORIGINS=http://localhost:3000
```

## Deployment

### Frontend (Vercel)

Connected to GitHub repo, auto-deploys on push to `main`.

Environment variable: `NEXT_PUBLIC_ICP_API_URL` = Railway backend URL.

### Backend (Railway)

- Root directory: `backend`
- Uses Dockerfile for build
- Environment variables: `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS`
- Supports long-running tasks (ICP search can take several minutes)

## Project Structure

```
.
├── app/                    # Next.js pages
│   ├── dashboard/
│   │   └── page.tsx        # Main ICP Finder page
│   └── layout.tsx
├── components/
│   └── validation-sidebar.tsx
├── lib/
│   ├── icp-api.ts          # API client for backend
│   └── utils.ts
├── backend/
│   ├── server.py           # FastAPI server
│   ├── find_icps.py        # Agent logic + platform prompts
│   ├── Dockerfile
│   └── requirements.txt
└── vercel.json
```
