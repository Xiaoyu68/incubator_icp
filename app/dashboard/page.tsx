import Link from "next/link"
import {
  Lightbulb,
  ClipboardCheck,
  Users,
  Target,
  ArrowRight,
} from "lucide-react"

const steps = [
  {
    icon: Lightbulb,
    title: "Idea Forge",
    description: "Describe your vision and let AI analyze market potential",
    href: "/dashboard/idea",
    step: 1,
  },
  {
    icon: ClipboardCheck,
    title: "Diagnostic",
    description: "Run preliminary evaluation across 6 core dimensions",
    href: "/dashboard/diagnostic",
    step: 2,
  },
  {
    icon: Users,
    title: "Personas",
    description: "Identify your Ideal Customer Profiles with AI assistance",
    href: "/dashboard/personas",
    step: 3,
  },
  {
    icon: Target,
    title: "Sourcing",
    description: "Select platforms to scout for synthetic ICPs",
    href: "/dashboard/sourcing",
    step: 4,
  },
]

export default function DashboardOverview() {
  return (
    <div className="p-8 lg:p-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome to ValidationOS
        </h1>
        <p className="mt-2 text-muted-foreground">
          Start your validation journey by following the steps below.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {steps.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="group relative flex flex-col rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
          >
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                <step.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Step {step.step}
              </span>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              {step.title}
            </h2>
            <p className="mb-4 flex-1 text-muted-foreground">
              {step.description}
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
