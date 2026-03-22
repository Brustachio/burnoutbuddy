export interface User {
  id: string
  email: string
  full_name: string | null
}

export interface AuthResult {
  success: boolean
  error: string | null
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
