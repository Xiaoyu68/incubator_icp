const ICP_API_BASE = process.env.NEXT_PUBLIC_ICP_API_URL || "http://localhost:8000"

// Platform ID mapping: UI id → API name
const PLATFORM_MAP: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "X/Twitter",
  reddit: "Reddit",
  hackernews: "Hacker News",
  indiehackers: "Indie Hackers",
  producthunt: "Product Hunt",
  devto: "Dev.to",
}

export function mapPlatformIds(uiIds: string[]): string[] {
  return uiIds.map((id) => PLATFORM_MAP[id]).filter(Boolean)
}

export interface SearchRequest {
  icp_description: string
  user_id: string
  platforms?: string[]
}

export interface PlatformProgress {
  status: "pending" | "searching" | "done" | "error"
  found: number
}

export interface ICPResult {
  name: string
  platform: string
  platforms_found_on?: string[]
  profile_url?: string
  title_role?: string
  company?: string
  industry?: string
  match_evidence?: string
  evidence_date?: string
  pain_points?: string[]
  contact_info?: {
    email?: string | null
    twitter_handle?: string | null
    linkedin_url?: string | null
    website?: string | null
  }
  relevance_score?: number
  notes?: string
}

export interface JobData {
  id: string
  user_id: string
  icp_description: string
  status: "pending" | "running" | "done" | "error"
  platform_progress: Record<string, PlatformProgress>
  results: {
    icp_description?: string
    search_summary?: string
    results?: ICPResult[]
    platform_breakdown?: Record<string, { found: number; notes: string }>
    search_queries_used?: string[]
    recommendations?: string
  } | null
  error_message?: string | null
}

export async function startSearch(req: SearchRequest): Promise<string> {
  const res = await fetch(`${ICP_API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Search failed: ${err}`)
  }
  const data = await res.json()
  return data.job_id
}

export async function getJob(jobId: string): Promise<JobData> {
  const res = await fetch(`${ICP_API_BASE}/jobs/${jobId}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch job: ${res.statusText}`)
  }
  return res.json()
}
