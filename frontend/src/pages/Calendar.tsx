import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type CalendarEvent = {
  id?: string | number
  title?: string
  summary?: string
  start?: string
  end?: string
  start_time?: string
  end_time?: string
  source?: string
}

type CalendarApiResponse = {
  events?: CalendarEvent[]
  detail?: string
  message?: string
}

const mockEvents: CalendarEvent[] = [
  {
    id: 'm1',
    title: 'CS Midterm Review',
    start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    source: 'mock',
  },
  {
    id: 'm2',
    title: 'HCI Milestone Due',
    start: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    source: 'mock',
  },
]

function formatDateTime(raw?: string): string {
  if (!raw) return 'Unknown time'
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function CalendarPage() {
  const [googleToken, setGoogleToken] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const mergedEvents = useMemo(() => {
    if (events.length > 0) return events
    return mockEvents
  }, [events])

  const onGoogleTokenChange = (e: ChangeEvent<HTMLInputElement>) => {
    setGoogleToken(e.target.value)
  }

  const onIcsFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null)
  }

  const connectGoogle = () => {
    // Backend can redirect this route to Supabase-hosted OAuth for calendar scope.
    window.location.href = `${API_URL}/api/calendar/google/connect`
  }

  const parseApiResponse = async (response: Response): Promise<CalendarApiResponse> => {
    try {
      return (await response.json()) as CalendarApiResponse
    } catch {
      return {}
    }
  }

  const syncFromGoogleToken = async () => {
    if (!googleToken.trim()) {
      setError('Paste a Google access token first.')
      return
    }

    setIsLoading(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch(`${API_URL}/api/calendar/google/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ access_token: googleToken.trim() }),
      })

      const data = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to fetch Google events.')
      }

      const incoming = Array.isArray(data.events) ? data.events : []
      setEvents(incoming)
      setStatus(`Synced ${incoming.length} events from Google Calendar.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sync failed.')
    } finally {
      setIsLoading(false)
    }
  }

  const uploadIcs = async () => {
    if (!file) {
      setError('Choose an .ics or .ical file first.')
      return
    }

    setIsLoading(true)
    setError(null)
    setStatus(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_URL}/api/calendar/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: formData,
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to upload calendar file.')
      }

      const incoming = Array.isArray(data.events) ? data.events : []
      setEvents(incoming)
      setStatus(`Imported ${incoming.length} events from calendar file.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calendar upload failed.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl sm:text-3xl uppercase tracking-wide">Calendar Integration</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect Google or import .ics, then review upcoming assignments and events.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-full font-mono text-xs uppercase tracking-widest"
          >
            <Link to="/">
              Back
              Timer
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Account Linking
              </h2>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              Use the OAuth button for full flow, or paste a token if your team already has Supabase OAuth wired.
            </p>

            <div className="space-y-3">
              <Button
                onClick={connectGoogle}
                className="w-full rounded-full font-mono text-xs uppercase tracking-widest"
              >
                Connect Google Calendar
              </Button>

              <Input
                value={googleToken}
                onChange={onGoogleTokenChange}
                placeholder="Paste Google access token"
                className="font-mono text-xs"
              />

              <Button
                variant="outline"
                onClick={syncFromGoogleToken}
                disabled={isLoading}
                className="w-full rounded-full font-mono text-xs uppercase tracking-widest"
              >
                Sync Events
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Canvas / iCal Import
              </h2>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              Export your calendar from Canvas or Google and upload the .ics/.ical file.
            </p>

            <div className="space-y-3">
              <Input
                type="file"
                accept=".ics,.ical,text/calendar"
                onChange={onIcsFileChange}
                className="font-mono text-xs"
              />

              <Button
                variant="outline"
                onClick={uploadIcs}
                disabled={isLoading}
                className="w-full rounded-full font-mono text-xs uppercase tracking-widest"
              >
                Upload Calendar File
              </Button>
            </div>
          </section>
        </div>

        {(status || error) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              error
                ? 'border-destructive/40 text-destructive'
                : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {error || status}
          </div>
        )}

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Upcoming Assignments & Events
          </h2>
          <div className="space-y-2">
            {mergedEvents.map((event: CalendarEvent, idx: number) => (
              <div
                key={event.id || `${event.title || event.summary || 'event'}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-secondary/25 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{event.title || event.summary || 'Untitled event'}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(event.start || event.start_time)}</p>
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {event.source || 'calendar'}
                </span>
              </div>
            ))}
          </div>
          {events.length === 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              Showing sample events until your first sync succeeds.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
