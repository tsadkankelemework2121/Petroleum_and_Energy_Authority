import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import DepotsPage from './pages/DepotsPage'
import DriversPage from './pages/DriversPage'
import DriverPortalPage from './pages/DriverPortalPage'
import FuelDispatchPage from './pages/FuelDispatchPage'
import OilCompaniesPage from './pages/OilCompaniesPage'
import ProfilePage from './pages/ProfilePage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import TrackingPage from './pages/TrackingPage'
import TransportersPage from './pages/TransportersPage'
import LoginPage from './pages/LoginPage'
import DemoPage from './pages/DemoPage'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'

function IndexRoute() {
  const { user } = useAuth()
  if (user?.role === 'DRIVER') {
    return <Navigate to="/driver" replace />
  }
  if (user?.role === 'DEPOT_ADMIN') {
    return <Navigate to="/fuel-dispatch" replace />
  }
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<DemoPage />} />
      <Route path="/admin-login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<IndexRoute />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/fuel-dispatch" element={<FuelDispatchPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/driver" element={<DriverPortalPage />} />

          <Route path="/entities">
            <Route index element={<Navigate to="/entities/oil-companies" replace />} />
            <Route path="oil-companies" element={<OilCompaniesPage />} />
            <Route path="transporters" element={<TransportersPage />} />
            <Route path="depots" element={<DepotsPage />} />
            <Route path="drivers" element={<DriversPage />} />
          </Route>

          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
         
        </Route>
      </Route>
    </Routes>
  )
}
