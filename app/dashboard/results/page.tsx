"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Settings2,
  Filter,
  Download,
  Users,
  AtSign,
  Slack,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const candidates = [
  {
    id: 1,
    name: "Sarah Jenkins",
    avatar: "/avatars/sarah.jpg",
    score: 98,
    platforms: ["linkedin", "twitter"],
    role: "Head of Product",
    company: "Stripe",
    industry: "Fintech",
    evidence:
      "Recent post regarding friction in multi-tenant architecture migration.",
  },
  {
    id: 2,
    name: "Marcus Chen",
    avatar: "/avatars/marcus.jpg",
    score: 94,
    platforms: ["linkedin"],
    role: "VP Engineering",
    company: "Vercel",
    industry: "SaaS",
    evidence:
      "Likely buyer based on role transition and series C expansion needs.",
  },
  {
    id: 3,
    name: "Elena Rodriguez",
    avatar: "/avatars/elena.jpg",
    score: 89,
    platforms: ["linkedin", "slack"],
    role: "CTO",
    company: "Hugging Face",
    industry: "AI",
    evidence:
      "Discussing compute constraints and distributed training bottlenecks.",
  },
  {
    id: 4,
    name: "Jordan Dax",
    avatar: null,
    initials: "JD",
    score: 85,
    platforms: ["linkedin"],
    role: "Eng Manager",
    company: "Snowflake",
    industry: "Data",
    evidence:
      "Hiring for roles focused on data pipelines. High priority.",
  },
]

function PlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "linkedin":
      return <Users className="h-4 w-4 text-muted-foreground" />
    case "twitter":
      return <AtSign className="h-4 w-4 text-muted-foreground" />
    case "slack":
      return <Slack className="h-4 w-4 text-muted-foreground" />
    default:
      return null
  }
}

export default function ResultsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const profilesFound = 32
  const totalProfiles = 50
  const progress = (profilesFound / totalProfiles) * 100

  return (
    <div className="p-8 lg:p-12">
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Settings2 className="h-5 w-5 animate-spin text-primary [animation-duration:3s]" />
              <h2 className="text-2xl font-bold text-foreground">
                Scouting in Progress...
              </h2>
            </div>
            <p className="text-muted-foreground">
              Our AI agent is currently analyzing professional networks for
              high-intent profiles matching your ICP criteria. Leveraging
              real-time intent signals and industry movements.
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-primary">
              {profilesFound}/{totalProfiles}
            </div>
            <p className="text-sm uppercase tracking-wider text-muted-foreground">
              Profiles Found
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Initiated 2m ago</span>
            <span>Estimated completion: 4m</span>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl font-bold text-foreground">
          Candidate Intelligence Ledger
        </h3>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

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
              {candidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {candidate.avatar ? (
                        <Image
                          src={candidate.avatar}
                          alt={candidate.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                          {candidate.initials}
                        </div>
                      )}
                      <span className="font-medium text-foreground">
                        {candidate.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-md border border-primary/30 bg-accent px-2 py-1 text-sm font-semibold text-accent-foreground">
                      {candidate.score}/100
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5">
                      {candidate.platforms.map((platform) => (
                        <PlatformIcon key={platform} platform={platform} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {candidate.role}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {candidate.company}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {candidate.industry}
                  </td>
                  <td className="max-w-xs px-6 py-4 text-sm text-muted-foreground">
                    {candidate.evidence}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing 1-4 of {profilesFound} identified profiles
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
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
