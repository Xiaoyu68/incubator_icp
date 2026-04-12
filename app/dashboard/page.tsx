"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Search,
  Loader2,
  Download,
  CheckCircle2,
  AlertCircle,
  Settings2,
  ExternalLink,
  Users,
  AtSign,
  MessageSquare,
  Newspaper,
  Code2,
  Globe,
  ChevronLeft,
  ChevronRight,
  Share2,
  BarChart2,
  Plus,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  startSearch,
  getJob,
  mapPlatformIds,
  type JobData,
  type ICPResult,
} from "@/lib/icp-api"

// --- Platform config ---

const PLATFORMS = [
  { id: "linkedin", name: "LinkedIn", icon: Share2 },
  { id: "twitter", name: "X / Twitter", icon: BarChart2 },
  { id: "reddit", name: "Reddit", icon: MessageSquare },
  { id: "hackernews", name: "Hacker News", icon: Newspaper },
  { id: "indiehackers", name: "Indie Hackers", icon: Code2 },
]

// --- Helpers ---

const ITEMS_PER_PAGE = 10

function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase()
  if (p.includes("linkedin")) return <Users className="h-4 w-4 text-muted-foreground" title="LinkedIn" />
  if (p.includes("twitter") || p.includes("x/")) return <AtSign className="h-4 w-4 text-muted-foreground" title="X/Twitter" />
  if (p.includes("reddit")) return <MessageSquare className="h-4 w-4 text-muted-foreground" title="Reddit" />
  if (p.includes("hacker")) return <Newspaper className="h-4 w-4 text-muted-foreground" title="Hacker News" />
  if (p.includes("indie")) return <Code2 className="h-4 w-4 text-muted-foreground" title="Indie Hackers" />
  return <Globe className="h-4 w-4 text-muted-foreground" title={platform} />
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
    case "searching":
      return <Settings2 className="h-3.5 w-3.5 animate-spin text-primary [animation-duration:3s]" />
    case "error":
      return <AlertCircle className="h-3.5 w-3.5 text-destructive" />
    default:
      return <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
  }
}

// --- Main page ---

export default function ICPFinderPage() {
  // Input state
  const [prompt, setPrompt] = useState("")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "linkedin", "twitter", "reddit", "hackernews", "indiehackers",
  ])

  // Job state
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<JobData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pollingRef = useRef(false)

  // Toggle platform
  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  // Start search
  const handleSearch = async () => {
    if (!prompt.trim()) {
      setError("Please describe your ideal customer profile.")
      return
    }
    if (selectedPlatforms.length === 0) {
      setError("Please select at least one platform.")
      return
    }

    setLoading(true)
    setError(null)
    setJob(null)
    setJobId(null)
    setCurrentPage(1)

    try {
      const id = await startSearch({
        icp_description: prompt.trim(),
        user_id: "default-user",
        platforms: mapPlatformIds(selectedPlatforms),
      })
      setJobId(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start search")
      setLoading(false)
    }
  }

  // Poll job
  const poll = useCallback(async (id: string) => {
    try {
      const data = await getJob(id)
      setJob(data)
      return data.status === "done" || data.status === "error"
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch job status")
      return true
    }
  }, [])

  useEffect(() => {
    if (!jobId) return
    pollingRef.current = true
    setLoading(true)

    let timer: ReturnType<typeof setTimeout>

    async function tick() {
      const done = await poll(jobId!)
      if (done) {
        setLoading(false)
        pollingRef.current = false
      } else if (pollingRef.current) {
        timer = setTimeout(tick, 3000)
      }
    }

    tick()
    return () => {
      pollingRef.current = false
      clearTimeout(timer)
    }
  }, [jobId, poll])

  // Derived
  const results: ICPResult[] = job?.results?.results ?? []
  const totalFound = results.length
  const platformProgress = job?.platform_progress ?? {}
  const totalPlatforms = Object.keys(platformProgress).length
  const donePlatforms = Object.values(platformProgress).filter((p) => p.status === "done").length
  const isRunning = job?.status === "running" || job?.status === "pending"
  const isDone = job?.status === "done"
  const isError = job?.status === "error"

  const totalPages = Math.max(1, Math.ceil(totalFound / ITEMS_PER_PAGE))
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
  const pageResults = results.slice(startIdx, startIdx + ITEMS_PER_PAGE)

  // Export CSV
  const handleExportCsv = () => {
    if (!results.length) return
    const headers = ["Name", "Score", "Platform", "Role", "Company", "Industry", "Evidence", "Pain Points", "Profile URL", "Email", "LinkedIn", "Twitter", "Website"]
    const rows = results.map((r) => [
      r.name,
      r.relevance_score?.toString() ?? "",
      r.platforms_found_on?.join("; ") ?? r.platform,
      r.title_role ?? "",
      r.company ?? "",
      r.industry ?? "",
      r.match_evidence ?? "",
      r.pain_points?.join("; ") ?? "",
      r.profile_url ?? "",
      r.contact_info?.email ?? "",
      r.contact_info?.linkedin_url ?? "",
      r.contact_info?.twitter_handle ?? "",
      r.contact_info?.website ?? "",
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `icp-results-${job?.id?.slice(0, 8) ?? "export"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Reset
  const handleReset = () => {
    setJobId(null)
    setJob(null)
    setError(null)
    setLoading(false)
    setCurrentPage(1)
    pollingRef.current = false
  }

  return (
    <div className="p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          ICP Finder
        </h1>
        <p className="mt-2 text-muted-foreground">
          Describe your ideal customer profile and we'll search across multiple platforms to find matching leads.
        </p>
      </div>

      {/* Input section */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <label className="mb-2 block text-sm font-semibold text-foreground">
          Describe your ICP
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
          placeholder="e.g. Solo technical founders building B2B SaaS tools, pre-revenue, active in startup communities, frustrated with existing validation methods..."
          className="mb-4 min-h-[120px] w-full resize-none rounded-lg border border-border bg-background p-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        />

        {/* Platform toggles */}
        <label className="mb-2 block text-sm font-semibold text-foreground">
          Search Platforms
        </label>
        <div className="mb-4 flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => togglePlatform(p.id)}
              disabled={loading}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                selectedPlatforms.includes(p.id)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              <p.icon className="h-3.5 w-3.5" />
              {p.name}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSearch}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90",
              loading && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading ? (
              <>
                Searching...
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : (
              <>
                Find ICPs
                <Search className="h-4 w-4" />
              </>
            )}
          </button>
          {job && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              New Search
            </button>
          )}
        </div>
      </div>

      {/* Progress section */}
      {job && (
        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              {isRunning && <Settings2 className="h-5 w-5 animate-spin text-primary [animation-duration:3s]" />}
              {isDone && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {isError && <AlertCircle className="h-5 w-5 text-destructive" />}
              <span className="text-lg font-semibold text-foreground">
                {isRunning && "Searching..."}
                {isDone && "Search Complete"}
                {isError && "Search Failed"}
              </span>
              <span className="text-sm text-muted-foreground">
                {isDone && `${totalFound} profiles found`}
                {isError && (job.error_message ?? "An unexpected error occurred.")}
              </span>
            </div>
            {isDone && results.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            )}
          </div>

          {/* Platform progress badges */}
          {totalPlatforms > 0 && (
            <div className="mt-4">
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${totalPlatforms > 0 ? (donePlatforms / totalPlatforms) * 100 : 0}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(platformProgress).map(([name, progress]) => (
                  <div
                    key={name}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs"
                  >
                    <StatusBadge status={progress.status} />
                    <span className="text-foreground">{name}</span>
                    {progress.found > 0 && (
                      <span className="text-muted-foreground">({progress.found})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results table */}
      {job && (isRunning || results.length > 0) && (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform(s)</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Industry</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Match Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {pageResults.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        Searching for matching profiles... Results will appear here.
                      </td>
                    </tr>
                  )}
                  {pageResults.map((candidate, idx) => {
                    const platforms = candidate.platforms_found_on ?? [candidate.platform]
                    return (
                      <tr
                        key={`${candidate.name}-${idx}`}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                              {getInitials(candidate.name)}
                            </div>
                            <div>
                              <span className="font-medium text-foreground">{candidate.name}</span>
                              {candidate.profile_url && (
                                <a
                                  href={candidate.profile_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1.5 inline-flex text-muted-foreground hover:text-primary"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-md border border-primary/30 bg-accent px-2 py-1 text-sm font-semibold text-accent-foreground">
                            {candidate.relevance_score ?? "—"}/10
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5">
                            {platforms.map((platform) => (
                              <PlatformIcon key={platform} platform={platform} />
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">{candidate.title_role ?? "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{candidate.company ?? "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{candidate.industry ?? "—"}</td>
                        <td className="max-w-xs px-6 py-4 text-sm text-muted-foreground">{candidate.match_evidence ?? "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalFound > ITEMS_PER_PAGE && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIdx + 1}-{Math.min(startIdx + ITEMS_PER_PAGE, totalFound)} of {totalFound}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
