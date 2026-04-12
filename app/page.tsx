import Link from "next/link"
import { Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex max-w-3xl flex-col items-center text-center">
        <div className="mb-8 flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
          <Zap className="h-4 w-4" />
          <span>Validation Phase: Active</span>
        </div>

        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
          <span className="text-balance">
            From Raw Intent to{" "}
            <em className="text-primary">Market Reality</em> in Days.
          </span>
        </h1>

        <p className="mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
          Unitas bypasses the guesswork. Our Ethereal Engine stress-tests your
          vision against real-time market signals and synthetic ICPs before you
          write a single line of code.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/dashboard/idea"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start Validating
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-secondary px-8 py-4 text-base font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            View Demo
          </Link>
        </div>
      </div>
    </div>
  )
}
