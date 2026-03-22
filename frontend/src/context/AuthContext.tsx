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

async function registerWithBackend(providerToken: string): Promise<User | null> {
  localStorage.setItem('google_provider_token', providerToken)
  try {
    const user = await authApi.googleLogin()
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

  useEffect(() => {
    if (!supabase) {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
      return
    }

    // Check existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.provider_token) {
        const user = await registerWithBackend(session.provider_token)
        if (user) {
          dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } })
          return
        }
      }
      // Fall back: check if we have a stored token (provider_token is only available right after OAuth)
      const storedToken = localStorage.getItem('google_provider_token')
      if (session && storedToken) {
        try {
          const user = await authApi.googleLogin()
          dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } })
          return
        } catch {
          // token expired or invalid
        }
      }
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.provider_token) {
        const user = await registerWithBackend(session.provider_token)
        if (user) {
          dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } })
          return
        }
      }
      if (!session) {
        localStorage.removeItem('google_provider_token')
        dispatch({ type: AUTH_ACTIONS.LOGOUT })
      }
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
