import { Outlet } from 'react-router-dom'
import { AppProvider } from '../context/AppContext'
import { AuthProvider } from '../context/AuthContext'

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <Outlet />
      </AppProvider>
    </AuthProvider>
  )
}
