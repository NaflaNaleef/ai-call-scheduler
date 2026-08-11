import { useState, useEffect } from "react"
import { X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"

interface ChangelogEntry {
  id: string
  title: string
  description: string
  release_date: string
}

interface ChangelogPanelProps {
  open: boolean
  onClose: () => void
  onRead: () => void
}

const STORAGE_KEY = 'changelog_last_seen'

export function ChangelogPanel({
  open, onClose, onRead
}: ChangelogPanelProps) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    supabase
      .from('changelog')
      .select('id, title, description, release_date')
      .eq('is_published', true)
      .order('release_date', { ascending: false })
      .then(({ data }) => {
        setEntries(data || [])
        setLoading(false)
        // Mark as read
        localStorage.setItem(
          STORAGE_KEY,
          new Date().toISOString()
        )
        onRead()
      })
  }, [open])

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-AU', {
      month: 'long',
      year: 'numeric'
    })

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div className="fixed right-0 top-0 h-full w-80
        bg-card border-l border-border shadow-xl z-50
        flex flex-col animate-in slide-in-from-right
        duration-200">

        {/* Header */}
        <div className="flex items-center justify-between
          px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">
              What's New
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto p-4
          space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 border-2
                border-primary border-t-transparent
                rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground
              text-center py-8">
              No updates yet.
            </p>
          ) : (
            entries.map((entry, index) => (
              <div key={entry.id}
                className="space-y-1.5">
                {/* Show month label when date changes */}
                {(index === 0 ||
                  formatDate(entries[index - 1].release_date)
                  !== formatDate(entry.release_date)) && (
                  <p className="text-xs font-medium
                    text-muted-foreground uppercase
                    tracking-wide pt-2">
                    {formatDate(entry.release_date)}
                  </p>
                )}
                <div className="rounded-lg border
                  border-border bg-muted/30 p-3
                  space-y-1">
                  <div className="flex items-start
                    justify-between gap-2">
                    <p className="text-sm font-medium
                      leading-tight">
                      {entry.title}
                    </p>
                    {index === 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-primary/30
                          text-primary bg-primary/5
                          shrink-0"
                      >
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground
                    leading-relaxed">
                    {entry.description}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <a
            href="/profile"
            className="text-xs text-muted-foreground
              hover:text-foreground transition-colors"
          >
            📖 View User Guide →
          </a>
        </div>
      </div>
    </>
  )
}

export function useChangelogUnread() {
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    const lastSeen = localStorage.getItem(STORAGE_KEY)
    supabase
      .from('changelog')
      .select('updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!data || data.length === 0) return
        const latestUpdate = new Date(data[0].updated_at)
        if (!lastSeen) {
          setHasUnread(true)
          return
        }
        setHasUnread(latestUpdate > new Date(lastSeen))
      })
  }, [])

  return { hasUnread, setHasUnread }
}
