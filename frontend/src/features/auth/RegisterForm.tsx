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

function RegisterFormContent() {
  const { loginWithGoogle, isLoading } = useAuth()

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Sign up with your Google account</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={loginWithGoogle}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Signing up...' : 'Sign up with Google'}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function RegisterForm() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterFormContent />
    </Suspense>
  )
}
