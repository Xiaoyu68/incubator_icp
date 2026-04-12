import Link from "next/link"
import {
  TrendingUp,
  AlertCircle,
  Sparkles,
  Scale,
  Shield,
  Cog,
  CheckCircle,
} from "lucide-react"

const metrics = [
  {
    icon: TrendingUp,
    title: "Market Size",
    description:
      "TAM/SAM analysis indicates a scalable opportunity within high-growth verticals.",
    progress: 100,
  },
  {
    icon: AlertCircle,
    title: "Problem Intensity",
    description:
      "Sentiment analysis confirms high friction levels in current manual workflows.",
    progress: 100,
  },
  {
    icon: Sparkles,
    title: "Solution Fit",
    description:
      "Proposed AI architecture maps directly to core user pain points identified.",
    progress: 100,
  },
  {
    icon: Scale,
    title: "Scalability",
    description:
      "Low marginal costs per new user. Infrastructure supports rapid expansion.",
    progress: 100,
  },
  {
    icon: Shield,
    title: "Competition",
    description:
      "Blue ocean strategy confirmed. Current rivals lack integrated AI-native logic.",
    progress: 100,
  },
  {
    icon: Cog,
    title: "Feasibility",
    description:
      "Resource requirements align with current runway and technical stack.",
    progress: 100,
  },
]

export default function DiagnosticPage() {
  return (
    <div className="p-8 lg:p-12">
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-full border border-primary bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Analysis Complete
          </span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            System High Confidence
          </span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Preliminary Evaluation
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Our AI-driven diagnostic has processed your concept through the Unitas
          proprietary validation engine. Your project shows strong viability
          markers across the foundational dimensions.
        </p>
      </div>

      <div className="mb-10 flex flex-col items-start gap-6 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center">
        <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-full border-4 border-primary">
          <div className="text-center">
            <span className="text-3xl font-bold text-foreground">100%</span>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Viability
            </p>
          </div>
        </div>
        <div className="flex-1">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Validation Diagnostic
          </h2>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle className="h-4 w-4" />
            Green Light: Concept Ready for Phase 2
          </div>
          <p className="text-sm text-muted-foreground">
            Your concept has satisfied 6 out of 6 core dimensions. The alignment
            between technical feasibility and market demand suggests an optimal
            probability of successful incubation. Proceeding to audience
            segmentation is highly recommended.
          </p>
        </div>
        <Link
          href="/dashboard/personas"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Identify Your Customers
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <metric.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">
              {metric.title}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {metric.description}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${metric.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
