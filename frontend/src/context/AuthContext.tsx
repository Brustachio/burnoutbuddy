import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { authApi } from '@/services/api'
import type { AuthState, User } from '@/types/auth'

const AUTH_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
} as const

type AuthAction =
  | { type: typeof AUTH_ACTIONS.LOGIN_SUCCESS; payload: { user: User } }
  | { type: typeof AUTH_ACTIONS.LOGOUT }
  | { type: typeof AUTH_ACTIONS.SET_LOADING; payload: boolean }

const AuthStateContext = createContext<AuthState | null>(null)
const AuthDispatchContext = createContext<{
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
} | null>(null)

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
}

const AUTH_INIT_TIMEOUT_MS = 8000

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        isLoading: false,
      }
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
      }
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload }
    default:
      return state
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Auth request timed out'))
    }, timeoutMs)

    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timer)
        reject(error)
      })
  })
}

function getLocalUserFromSession(session: { user?: { id: string; email?: string | null; user_metadata?: unknown } }): User {
  const metadata = session.user?.user_metadata as Record<string, unknown> | undefined
  const fullName =
    (typeof metadata?.full_name === 'string' && metadata.full_name) ||
    (typeof metadata?.name === 'string' && metadata.name) ||
    null

  return {
    id: session.user?.id || 'google-user',
    email: session.user?.email || '',
    full_name: fullName,
  }
}

async function registerWithBackend(providerToken: string): Promise<User | null> {
  localStorage.setItem('google_provider_token', providerToken)
  try {
    const user = await withTimeout(authApi.googleLogin(), AUTH_INIT_TIMEOUT_MS)
    return user
  } catch {
    return null
  }
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const clearHashFragment = () => {
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  useEffect(() => {
    if (!supabase) {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
      return
    }

    async function initializeAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        // Prefer provider_token but fall back to access_token for existing sessions.
        const sessionToken = session?.provider_token || session?.access_token
        const storedToken = localStorage.getItem('google_provider_token')
        const token = sessionToken || storedToken

        if (token) {
          const user = await registerWithBackend(token)
          if (user) {
            clearHashFragment()
            dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } })
            return
          }

          if (session?.user) {
            clearHashFragment()
            dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user: getLocalUserFromSession(session) } })
            return
          }

          localStorage.removeItem('google_provider_token')
        }

        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
      } catch (error) {
        console.error('Auth init failed', error)
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        localStorage.removeItem('google_provider_token')
        dispatch({ type: AUTH_ACTIONS.LOGOUT })
        return
      }

      const token = session.provider_token || session.access_token || localStorage.getItem('google_provider_token')
      if (token) {
        const user = await registerWithBackend(token)
        if (user) {
          clearHashFragment()
          dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } })
          return
        }

        clearHashFragment()
        dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user: getLocalUserFromSession(session) } })
        return
      }

      // If we can't resolve a user from session, ensure app exits protected state
      localStorage.removeItem('google_provider_token')
      dispatch({ type: AUTH_ACTIONS.LOGOUT })
    })

    return () => subscription.unsubscribe()
  }, [])

  const loginWithGoogle = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
      },
    })
  }, [])

  const logout = useCallback(async () => {
    if (!supabase) return
    localStorage.removeItem('google_provider_token')
    await supabase.auth.signOut()
    dispatch({ type: AUTH_ACTIONS.LOGOUT })
  }, [])

  return (
    <AuthStateContext.Provider value={state}>
      <AuthDispatchContext.Provider value={{ loginWithGoogle, logout }}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  )
}

export function useAuthState() {
  const context = useContext(AuthStateContext)
  if (!context) {
    throw new Error('useAuthState must be used within an AuthProvider')
  }
  return context
}

export function useAuthDispatch() {
  const context = useContext(AuthDispatchContext)
  if (!context) {
    throw new Error('useAuthDispatch must be used within an AuthProvider')
  }
  return context
}

export function useAuth() {
  return {
    ...useAuthState(),
    ...useAuthDispatch(),
  }
}
