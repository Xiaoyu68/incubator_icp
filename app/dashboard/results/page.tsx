"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Settings2,
  Filter,
  Download,
  Users,
  AtSign,
  MessageSquare,
  Newspaper,
  Code2,
  Globe,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react"
import { getJob, type JobData, type ICPResult } from "@/lib/icp-api"

const ITEMS_PER_PAGE = 10

function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase()
  if (p.includes("linkedin")) return <Users className="h-4 w-4 text-muted-foreground" title="LinkedIn" />
  if (p.includes("twitter") || p.includes("x/")) return <AtSign className="h-4 w-4 text-muted-foreground" title="X/Twitter" />
  if (p.includes("reddit")) return <MessageSquare className="h-4 w-4 text-muted-foreground" title="Reddit" />
  if (p.includes("hacker")) return <Newspaper className="h-4 w-4 text-muted-foreground" title="Hacker News" />
  if (p.includes("indie")) return <Code2 className="h-4 w-4 text-muted-foreground" title="Indie Hackers" />
  if (p.includes("product")) return <Globe className="h-4 w-4 text-muted-foreground" title="Product Hunt" />
  if (p.includes("dev.to")) return <Code2 className="h-4 w-4 text-muted-foreground" title="Dev.to" />
  return <Globe className="h-4 w-4 text-muted-foreground" title={platform} />
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
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

export default function ResultsPage() {
  const [job, setJob] = useState<JobData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const poll = useCallback(async () => {
    const jobId = localStorage.getItem("icp_job_id")
    if (!jobId) {
      setError("No active search found. Please start a search from the Sourcing page.")
      return false
    }
    try {
      const data = await getJob(jobId)
      setJob(data)
      return data.status === "done" || data.status === "error"
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch job status")
      return true // stop polling on error
    }
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let stopped = false

    async function tick() {
      const done = await poll()
      if (!done && !stopped) {
        timer = setTimeout(tick, 3000)
      }
    }

    tick()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [poll])

  const results: ICPResult[] = job?.results?.results ?? []
  const totalFound = results.length
  const platformProgress = job?.platform_progress ?? {}
  const totalPlatforms = Object.keys(platformProgress).length
  const donePlatforms = Object.values(platformProgress).filter((p) => p.status === "done").length
  const isRunning = job?.status === "running" || job?.status === "pending"
  const isDone = job?.status === "done"
  const isError = job?.status === "error"

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalFound / ITEMS_PER_PAGE))
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
  const pageResults = results.slice(startIdx, startIdx + ITEMS_PER_PAGE)

  const handleExportCsv = () => {
    if (!results.length) return
    const headers = ["Name", "Score", "Platform", "Role", "Company", "Industry", "Evidence", "Profile URL"]
    const rows = results.map((r) => [
      r.name,
      r.relevance_score?.toString() ?? "",
      r.platforms_found_on?.join("; ") ?? r.platform,
      r.title_role ?? "",
      r.company ?? "",
      r.industry ?? "",
      r.match_evidence ?? "",
      r.profile_url ?? "",
    ])
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `icp-results-${job?.id?.slice(0, 8) ?? "export"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error && !job) {
    return (
      <div className="p-8 lg:p-12">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{error}</h2>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12">
      {/* Progress header */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              {isRunning && (
                <Settings2 className="h-5 w-5 animate-spin text-primary [animation-duration:3s]" />
              )}
              {isDone && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {isError && <AlertCircle className="h-5 w-5 text-destructive" />}
              <h2 className="text-2xl font-bold text-foreground">
                {isRunning && "Scouting in Progress..."}
                {isDone && "Scouting Complete"}
                {isError && "Search Failed"}
                {!job && "Loading..."}
              </h2>
            </div>
            <p className="text-muted-foreground">
              {isRunning &&
                "Our AI agent is analyzing platforms for high-intent profiles matching your ICP criteria."}
              {isDone && (job?.results?.search_summary ?? `Found ${totalFound} matching profiles across ${totalPlatforms} platforms.`)}
              {isError && (job?.error_message ?? "An unexpected error occurred.")}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-primary">{totalFound}</div>
            <p className="text-sm uppercase tracking-wider text-muted-foreground">
              Profiles Found
            </p>
          </div>
        </div>

        {/* Platform progress */}
        {totalPlatforms > 0 && (
          <div className="mt-6">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${totalPlatforms > 0 ? (donePlatforms / totalPlatforms) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
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

      {/* Table header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl font-bold text-foreground">
          Candidate Intelligence Ledger
        </h3>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button
            onClick={handleExportCsv}
            disabled={results.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Score
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Platform(s)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Industry
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Match Evidence
                </th>
              </tr>
            </thead>
            <tbody>
              {pageResults.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    {isRunning
                      ? "Searching for matching profiles... Results will appear here as they are found."
                      : "No results yet."}
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                          {getInitials(candidate.name)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            {candidate.name}
                          </span>
                          {candidate.profile_url && (
                            <a
                              href={candidate.profile_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 inline-flex text-muted-foreground hover:text-primary"
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
                    <td className="px-6 py-4 text-sm text-foreground">
                      {candidate.title_role ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {candidate.company ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {candidate.industry ?? "—"}
                    </td>
                    <td className="max-w-xs px-6 py-4 text-sm text-muted-foreground">
                      {candidate.match_evidence ?? "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalFound > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIdx + 1}-{Math.min(startIdx + ITEMS_PER_PAGE, totalFound)} of{" "}
            {totalFound} identified profiles
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
