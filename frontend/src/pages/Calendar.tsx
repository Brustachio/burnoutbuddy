import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { hasSupabaseConfig, supabase, supabaseConfigError } from '@/lib/supabase'
import { calendarApi } from '@/services/api'

const OAUTH_REDIRECT_TO = `${window.location.origin}/calendar`
const CALENDAR_CACHE_KEY = 'burnoutbuddy_google_calendar_events_v1'
const CALENDAR_CACHE_TIME_KEY = 'burnoutbuddy_google_calendar_events_synced_at_v1'

type CalendarEvent = {
  id?: string | number
  title?: string
  summary?: string
  start?: string
  end?: string
  start_time?: string
  end_time?: string
  source?: string
  all_day?: boolean
}

function readCachedEvents(): CalendarEvent[] {
  try {
    const raw = window.localStorage.getItem(CALENDAR_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as CalendarEvent[]) : []
  } catch {
    return []
  }
}

function writeCachedEvents(nextEvents: CalendarEvent[]): void {
  try {
    window.localStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(nextEvents))
    window.localStorage.setItem(CALENDAR_CACHE_TIME_KEY, new Date().toISOString())
  } catch {
    // If localStorage fails (privacy mode/quota), keep app behavior functional.
  }
}

function clearCachedEvents(): void {
  try {
    window.localStorage.removeItem(CALENDAR_CACHE_KEY)
    window.localStorage.removeItem(CALENDAR_CACHE_TIME_KEY)
  } catch {
    // Best-effort cache cleanup.
  }
}

function readCachedSyncTime(): string | null {
  try {
    return window.localStorage.getItem(CALENDAR_CACHE_TIME_KEY)
  } catch {
    return null
  }
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

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number)
    if (!year || !month || !day) return null
    return new Date(year, month - 1, day)
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function isAllDayEvent(event: CalendarEvent, start: Date): boolean {
  if (event.all_day) return true

  const raw = event.start || event.start_time || ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return true

  return start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0
}

export default function CalendarPage() {
  const [hasTriedGoogleLogin, setHasTriedGoogleLogin] = useState(false)
  const [isGoogleLinked, setIsGoogleLinked] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>(() => readCachedEvents())
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasAutoSyncedAfterLink, setHasAutoSyncedAfterLink] = useState(false)

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

  const weekStartLabel = useMemo(() => {
    const firstDay = weekDays[0]
    if (!firstDay) return ''
    return firstDay.toLocaleDateString()
  }, [weekDays])

  const cachedSyncLabel = useMemo(() => {
    const raw = readCachedSyncTime()
    if (!raw) return null

    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return null

    return parsed.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
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
        if (session.provider_token) {
          localStorage.setItem('google_provider_token', session.provider_token)
        }
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

  const logoutGoogle = async () => {
    if (!supabase) {
      setError(supabaseConfigError || 'Supabase is not configured.')
      return
    }

    const { error: logoutError } = await supabase.auth.signOut()
    if (logoutError) {
      setError(logoutError.message || 'Failed to log out.')
      return
    }

    setIsGoogleLinked(false)
    setHasTriedGoogleLogin(false)
    setHasAutoSyncedAfterLink(false)
    setEvents([])
    clearCachedEvents()
    setError(null)
    setStatus('Logged out of Google Calendar.')
  }

  const syncFromGoogle = useCallback(async () => {
    if (!isGoogleLinked) {
      setError('Use Login with Google first to link your calendar account.')
      return
    }

    setIsLoading(true)
    setError(null)
    setStatus('Syncing Google Calendar...')

    try {
      const data = await calendarApi.getEvents()
      const incoming = data.events ?? []
      setEvents(incoming)
      writeCachedEvents(incoming)
      setStatus(`Synced ${incoming.length} events from Google Calendar.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sync failed.')
    } finally {
      setIsLoading(false)
    }
  }, [isGoogleLinked])

  useEffect(() => {
    if (!isGoogleLinked) {
      return
    }

    if (hasAutoSyncedAfterLink) {
      return
    }

    setHasAutoSyncedAfterLink(true)
    void syncFromGoogle()
  }, [hasAutoSyncedAfterLink, isGoogleLinked, syncFromGoogle])

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium">Calendar Integration</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isGoogleLinked
                ? 'Your Google calendar syncs automatically when you open this page.'
                : 'Sign in with Google to load your calendar directly.'}
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-md text-xs"
          >
            <Link to="/">
              Back to Timer
            </Link>
          </Button>
        </div>

        <section className="rounded-md border border-border bg-card p-5">
          <div className="mb-4 space-y-1">
            <h2 className="text-xs text-muted-foreground">
              {isGoogleLinked ? 'Calendar Sync' : 'Login'}
            </h2>
            {!isGoogleLinked && (
              <p className="text-sm text-muted-foreground">
                Start here first. Sign in with Google to load your events.
              </p>
            )}
          </div>

          {!hasSupabaseConfig && (
            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {supabaseConfigError}
            </div>
          )}

          <div className="space-y-3">
            {!isGoogleLinked && (
              <Button
                onClick={connectGoogle}
                disabled={!hasSupabaseConfig}
                className="w-full rounded-full font-mono text-xs uppercase tracking-widest"
              >
                Login With Google (Supabase)
              </Button>
            )}

            {isGoogleLinked && (
              <Button
                variant="outline"
                onClick={logoutGoogle}
                className="w-full rounded-full font-mono text-xs uppercase tracking-widest"
              >
                Logout of Google Calendar
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              Google Calendar Status: {isGoogleLinked ? 'Linked' : 'Unlinked'}
            </p>

            {!isGoogleLinked && hasTriedGoogleLogin && (
              <p className="text-xs text-muted-foreground">
                If you just completed Google login, your calendar updates automatically.
              </p>
            )}

          </div>
        </section>

        {(status || error) && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              error
                ? 'border-destructive/40 text-destructive'
                : isLoading
                  ? 'border-amber-500/40 text-amber-700 dark:text-amber-400'
                : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {error || status}
          </div>
        )}

        <section className="rounded-md border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-xs text-muted-foreground">
              This week
            </h2>
            <p className="text-xs text-muted-foreground">Showing next 7 days starting {weekStartLabel}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {weekDays.map((day) => {
              const key = day.toDateString()
              const items = weekEventsByDay[key] || []

              return (
                <div key={key} className="rounded-md border border-border/70 bg-secondary/20 p-3">
                  <p className="text-xs text-muted-foreground">
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
                          <p className="text-xs text-muted-foreground">
                            {isAllDayEvent(event, start) ? 'All day' : formatDateTime(start.toISOString())}
                          </p>
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
              {isGoogleLinked
                ? 'No Google events found for the next 7 days.'
                : 'No Google events loaded yet. Sign in with Google and wait a moment for automatic sync.'}
            </p>
          )}

          {events.length > 0 && cachedSyncLabel && (
            <p className="mt-4 text-xs text-muted-foreground">
              Showing cached events. Last updated: {cachedSyncLabel}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
