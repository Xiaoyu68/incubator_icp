import { ValidationSidebar } from "@/components/validation-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <ValidationSidebar />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
}
