import { FolderOpen } from 'lucide-react'

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Manage and organize client documents
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/10 py-16">
        <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">No documents yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Document management coming soon
        </p>
      </div>
    </div>
  )
}
