"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutGrid,
  Lightbulb,
  ClipboardCheck,
  Users,
  TrendingUp,
  Target,
  BarChart3,
  Zap,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/idea", label: "Idea Forge", icon: Lightbulb },
  { href: "/dashboard/diagnostic", label: "Diagnostic", icon: ClipboardCheck },
  { href: "/dashboard/personas", label: "Personas", icon: Users },
  { href: "/dashboard/sourcing", label: "Sourcing", icon: Target },
  { href: "/dashboard/results", label: "Results", icon: BarChart3 },
]

export function ValidationSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex flex-col gap-1 p-6">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Unitas
            </h1>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              ValidationOS
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4">
        <Link
          href="/dashboard/idea"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          New Analysis
        </Link>
      </div>
    </aside>
  )
}
