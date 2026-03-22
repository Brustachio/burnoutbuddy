import { createBrowserRouter, redirect } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import RootLayout from '../layouts/RootLayout'

const Index = lazy(() => import('../pages/Index'))
const Calendar = lazy(() => import('../pages/Calendar'))
const Emergency = lazy(() => import('../pages/Emergency'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <Index />
          </Suspense>
        ),
      },
      {
        path: 'calendar',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Calendar />
          </Suspense>
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
        path: '*',
        loader: () => redirect('/'),
      },
    ],
  },
])
