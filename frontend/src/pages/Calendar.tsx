import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { hasSupabaseConfig, supabase, supabaseConfigError } from '@/lib/supabase'

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
  const [hasTriedGoogleLogin, setHasTriedGoogleLogin] = useState(false)
  const [isGoogleLinked, setIsGoogleLinked] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const mergedEvents = useMemo(() => {
    if (events.length > 0) return events
    return mockEvents
  }, [events])

  useEffect(() => {
    if (!supabase) {
      return
    }

    const supabaseClient = supabase

    const initializeGoogleSession = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession()
      setIsGoogleLinked(!!session)
      if (session) {
        setHasTriedGoogleLogin(true)
      }
    }

    initializeGoogleSession()

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setIsGoogleLinked(!!session)
      if (session) {
        setHasTriedGoogleLogin(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const connectGoogle = async () => {
    if (!supabase) {
      setError(supabaseConfigError || 'Supabase is not configured.')
      return
    }

    const redirectTo = `${window.location.origin}/calendar`
    setHasTriedGoogleLogin(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
      },
    })

    if (error) {
      setError(error.message)
    }
  }

  const parseApiResponse = async (response: Response): Promise<CalendarApiResponse> => {
    try {
      return (await response.json()) as CalendarApiResponse
    } catch {
      return {}
    }
  }

  const syncFromGoogle = async () => {
    if (!supabase) {
      setError(supabaseConfigError || 'Supabase is not configured.')
      return
    }

    if (!isGoogleLinked) {
      setError('Use Login with Google first to link your calendar account.')
      return
    }

    setIsLoading(true)
    setError(null)
    setStatus(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const supabaseToken = session?.access_token || ''
      const headers: Record<string, string> = {}
      const bearerToken = supabaseToken

      if (bearerToken) {
        headers.Authorization = `Bearer ${bearerToken}`
      }
      if (supabaseToken) {
        headers['X-Supabase-Access-Token'] = supabaseToken
      }

      const response = await fetch(`${API_URL}/api/calendar/google/events`, {
        method: 'GET',
        headers,
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

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl sm:text-3xl uppercase tracking-wide">Calendar Integration</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with Google to load your calendar directly.
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

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 space-y-1">
            <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Login Page
            </h2>
            <p className="text-sm text-muted-foreground">
              Start here first. Sign in with Google, then click Update Calendar to load your events.
            </p>
          </div>

          {!hasSupabaseConfig && (
            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {supabaseConfigError}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={connectGoogle}
              disabled={!hasSupabaseConfig}
              className="w-full rounded-full font-mono text-xs uppercase tracking-widest"
            >
              Login With Google (Supabase)
            </Button>

            <Button
              variant="outline"
              onClick={syncFromGoogle}
              disabled={isLoading}
              className="w-full rounded-full font-mono text-xs uppercase tracking-widest"
            >
              {isLoading ? 'Updating...' : 'Update Calendar'}
            </Button>

            <p className="text-xs text-muted-foreground">
              Google status: {isGoogleLinked ? 'Linked' : 'Not linked'}
            </p>

            {hasTriedGoogleLogin && (
              <p className="text-xs text-muted-foreground">
                If you just completed Google login, click Update Calendar to load events.
              </p>
            )}
          </div>
        </section>

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
