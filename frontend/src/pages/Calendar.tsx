import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { hasSupabaseConfig, supabase, supabaseConfigError } from '@/lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const OAUTH_REDIRECT_TO = import.meta.env.VITE_SUPABASE_REDIRECT_TO || `${window.location.origin}/calendar`

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

function eventStart(rawEvent: CalendarEvent): Date | null {
  const raw = rawEvent.start || rawEvent.start_time
  if (!raw) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export default function CalendarPage() {
  const [hasTriedGoogleLogin, setHasTriedGoogleLogin] = useState(false)
  const [isGoogleLinked, setIsGoogleLinked] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const weekDays = useMemo(() => {
    const days: Date[] = []
    const start = new Date()
    start.setHours(0, 0, 0, 0)

    for (let i = 0; i < 7; i += 1) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }

    return days
  }, [])

  const weekEventsByDay = useMemo(() => {
    const grouped: Record<string, Array<{ event: CalendarEvent; start: Date }>> = {}

    weekDays.forEach((day) => {
      grouped[day.toDateString()] = []
    })

    events.forEach((event) => {
      const start = eventStart(event)
      if (!start) return

      const dayKey = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toDateString()
      if (grouped[dayKey]) {
        grouped[dayKey].push({ event, start })
      }
    })

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => a.start.getTime() - b.start.getTime())
    })

    return grouped
  }, [events, weekDays])

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

    setHasTriedGoogleLogin(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: OAUTH_REDIRECT_TO,
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
      },
    })

    if (error) {
      const rawMessage = error.message || ''
      if (rawMessage.includes('Unsupported provider') || rawMessage.includes('provider is not enabled')) {
        setError(
          'Supabase Google provider is not enabled. Enable Google in Supabase Auth Providers and set Google Cloud redirect URI to https://cewjshcnzejduanlxtjf.supabase.co/auth/v1/callback.'
        )
      } else {
        setError(rawMessage)
      }
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

            <p className="text-xs text-muted-foreground">
              OAuth redirect target: {OAUTH_REDIRECT_TO}
            </p>
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
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              1 Week Calendar
            </h2>
            <p className="text-xs text-muted-foreground">Showing next 7 days starting today</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {weekDays.map((day) => {
              const key = day.toDateString()
              const items = weekEventsByDay[key] || []

              return (
                <div key={key} className="rounded-md border border-border/70 bg-secondary/20 p-3">
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {day.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'numeric',
                      day: 'numeric',
                    })}
                  </p>

                  <div className="mt-2 space-y-2">
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No events</p>
                    ) : (
                      items.map(({ event, start }, idx) => (
                        <div
                          key={event.id || `${event.title || event.summary || 'event'}-${idx}`}
                          className="rounded border border-border/60 bg-background px-2 py-1.5"
                        >
                          <p className="truncate text-sm font-medium">
                            {event.title || event.summary || 'Untitled event'}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(start.toISOString())}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {events.length === 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              No Google events loaded yet. Sign in with Google and click Update Calendar.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
