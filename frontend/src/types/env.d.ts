/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_REDIRECT_TO?: string
  // Add other env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
