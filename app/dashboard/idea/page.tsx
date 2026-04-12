"use client"

import { useState } from "react"
import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"

export default function IdeaForgePage() {
  const [idea, setIdea] = useState("")

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 p-8 lg:p-12">
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Incubation Phase 1
              </p>
              <h1 className="text-2xl font-bold text-foreground">Idea Forge</h1>
            </div>
            <span className="text-sm text-muted-foreground">Step 1 of 4</span>
          </div>
          <div className="mt-4 flex gap-1">
            <div className="h-1 w-32 rounded-full bg-primary" />
            <div className="h-1 w-32 rounded-full bg-border" />
            <div className="h-1 w-32 rounded-full bg-border" />
            <div className="h-1 w-32 rounded-full bg-border" />
          </div>
        </div>

        <div className="max-w-3xl">
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
            Describe your vision.
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            {"Don't worry about the polish. Just tell us what you're building, who it's for, and why the world needs it."}
          </p>

          <div className="rounded-xl border border-border bg-card p-1">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="I'm building an AI-powered platform that helps urban gardeners optimize their crop yield using soil sensors and weather data..."
              className="min-h-[280px] w-full resize-none rounded-lg border-0 bg-transparent p-5 text-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>AI is ready to analyze your inputs in real-time.</span>
          </div>
          <Link
            href="/dashboard/diagnostic"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Next: Run Diagnostic
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
