"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Share2,
  BarChart2,
  MessageSquare,
  Newspaper,
  Code2,
  Plus,
  Zap,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { startSearch, mapPlatformIds } from "@/lib/icp-api"

const sources = [
  {
    id: "linkedin",
    icon: Share2,
    name: "LinkedIn",
    description:
      "Professional demographics and B2B engagement patterns for high-intent validation.",
    active: true,
  },
  {
    id: "twitter",
    icon: BarChart2,
    name: "X (Twitter Feed)",
    description:
      "Real-time pulse and viral sentiment analysis across technical and creative circles.",
    active: false,
  },
  {
    id: "reddit",
    icon: MessageSquare,
    name: "Reddit (Communities)",
    description:
      "Deep-dive into subreddit psychographics and unvarnished feedback loops.",
    active: false,
  },
  {
    id: "hackernews",
    icon: Newspaper,
    name: "Hacker News",
    description:
      "Technical rigorousness and early adopter skepticism for product-market fit.",
    active: false,
  },
  {
    id: "indiehackers",
    icon: Code2,
    name: "Indie Hackers",
    description:
      "Builder-centric insights and transparency data from active founders.",
    active: false,
  },
]

export default function SourcingPage() {
  const router = useRouter()
  const [selectedSources, setSelectedSources] = useState<string[]>(["linkedin"])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSource = (id: string) => {
    setSelectedSources((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : [...prev, id]
    )
  }

  const handleStartSearch = async () => {
    const idea = localStorage.getItem("icp_idea")
    if (!idea || !idea.trim()) {
      setError("Please go back to the Idea Forge and describe your vision first.")
      return
    }
    if (selectedSources.length === 0) {
      setError("Please select at least one platform.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const jobId = await startSearch({
        icp_description: idea.trim(),
        user_id: "default-user",
        platforms: mapPlatformIds(selectedSources),
      })
      // Store job_id for the results page
      localStorage.setItem("icp_job_id", jobId)
      router.push("/dashboard/results")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start search")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 p-8 lg:p-12">
        <div className="mb-8">
          <div className="mb-2 h-1 w-12 rounded-full bg-primary" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Identify Your Sources
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Select the platforms where our AI will scout for your synthetic ICPs
            to validate market demand. Our engine interprets signal density and
            sentiment across these clusters.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {sources.slice(0, 2).map((source) => (
            <button
              key={source.id}
              onClick={() => toggleSource(source.id)}
              disabled={loading}
              className={cn(
                "relative flex flex-col items-start rounded-xl border p-6 text-left transition-all",
                selectedSources.includes(source.id)
                  ? "border-primary bg-card shadow-lg"
                  : "border-border bg-card hover:border-primary/50",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              {selectedSources.includes(source.id) && (
                <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                  Active Scouting
                </span>
              )}
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <source.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {source.name}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {source.description}
              </p>
              {selectedSources.includes(source.id) && (
                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                  Configure Agents
                  <ArrowRight className="h-3 w-3" />
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {sources.slice(2).map((source) => (
            <button
              key={source.id}
              onClick={() => toggleSource(source.id)}
              disabled={loading}
              className={cn(
                "flex flex-col items-start rounded-xl border p-6 text-left transition-all",
                selectedSources.includes(source.id)
                  ? "border-primary bg-card shadow-lg"
                  : "border-border bg-card hover:border-primary/50",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <source.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">
                {source.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {source.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <Plus className="h-4 w-4" />
            Add Source
          </button>
          <button
            onClick={handleStartSearch}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90",
              loading && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading ? (
              <>
                Starting Search...
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : (
              <>
                Accept and Start Find
                <Zap className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
