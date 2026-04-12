import Link from "next/link"
import { Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">Unitas</span>
        </Link>
        <Link
          href="/login"
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
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
    </div>
  )
}
