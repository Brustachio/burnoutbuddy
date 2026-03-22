import { createBrowserRouter, redirect } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import RootLayout from '../layouts/RootLayout'
import { useAuthState } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

const Index = lazy(() => import('../pages/Index'))
const GetStarted = lazy(() => import('../pages/GetStarted'))
const Calendar = lazy(() => import('../pages/Calendar'))
const Emergency = lazy(() => import('../pages/Emergency'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
}

function IndexOrGetStarted() {
  const { isAuthenticated, isLoading } = useAuthState()

  if (isLoading) return <PageLoader />

  return isAuthenticated ? (
    <Suspense fallback={<PageLoader />}>
      <Index />
    </Suspense>
  ) : (
    <Suspense fallback={<PageLoader />}>
      <GetStarted />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <IndexOrGetStarted />,
      },
      {
        path: 'calendar',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Calendar />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'emergency',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Emergency />
          </Suspense>
        ),
      },
      {
        path: 'get-started',
        element: (
          <Suspense fallback={<PageLoader />}>
            <GetStarted />
          </Suspense>
        ),
      },
      {
        path: '*',
        loader: () => redirect('/'),
      },
    ],
  },
])
