import Link from "next/link"
import { ArrowRight, Users, Target, Briefcase } from "lucide-react"

const personas = [
  {
    title: "Technical Decision Makers",
    role: "CTOs, VP Engineering, Tech Leads",
    description:
      "Senior technical leaders evaluating infrastructure solutions for scaling teams. High budget authority and fast decision cycles.",
    traits: ["Enterprise SaaS experience", "Team size 50-500", "Series B-D"],
  },
  {
    title: "Product Leaders",
    role: "CPOs, Head of Product, PMs",
    description:
      "Product-focused executives seeking tools to accelerate development velocity and reduce time-to-market.",
    traits: ["B2B focus", "Growth stage", "AI-curious"],
  },
  {
    title: "Founder Operators",
    role: "CEOs, Co-founders, Solo founders",
    description:
      "Hands-on founders building the next generation of startups who need to validate fast and ship faster.",
    traits: ["Pre-seed to Seed", "Technical background", "First-time founders"],
  },
]

export default function PersonasPage() {
  return (
    <div className="p-8 lg:p-12">
      <div className="mb-8">
        <div className="mb-2 h-1 w-12 rounded-full bg-primary" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Ideal Customer Profiles
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Based on your concept analysis, we&apos;ve identified these high-intent
          customer segments. Select the profiles that best match your target
          market.
        </p>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {personas.map((persona, index) => (
          <div
            key={persona.title}
            className="group relative rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                {index === 0 && (
                  <Briefcase className="h-5 w-5 text-accent-foreground" />
                )}
                {index === 1 && (
                  <Target className="h-5 w-5 text-accent-foreground" />
                )}
                {index === 2 && (
                  <Users className="h-5 w-5 text-accent-foreground" />
                )}
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-background text-xs font-bold text-primary">
                {index + 1}
              </div>
            </div>

            <h3 className="mb-1 text-lg font-semibold text-foreground">
              {persona.title}
            </h3>
            <p className="mb-3 text-sm font-medium text-primary">
              {persona.role}
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              {persona.description}
            </p>

            <div className="flex flex-wrap gap-2">
              {persona.traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-6">
        <button className="text-sm font-medium text-primary hover:underline">
          + Add Custom Persona
        </button>
        <Link
          href="/dashboard/sourcing"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Continue to Sourcing
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
