import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'

function LoginFormContent() {
  const { loginWithGoogle, isLoading } = useAuth()

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Sign in with your Google account to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={loginWithGoogle}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function LoginForm() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginFormContent />
    </Suspense>
  )
}
