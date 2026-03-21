import { Outlet } from 'react-router-dom'
import { AppProvider } from '../context/AppContext'

export default function RootLayout() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  )
}
