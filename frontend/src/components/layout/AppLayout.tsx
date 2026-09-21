import type { ComponentType, SVGProps } from 'react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import logo from "../../assets/logo.png"
import {
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  ClipboardDocumentListIcon,
  MapIcon,
  Squares2X2Icon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import { cn } from '../../lib/cn'

import profileImg from '../../assets/profile.jpg'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../data/types'

type NavItem = {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  end?: boolean
}

const primaryNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Squares2X2Icon },
  { to: '/tracking', label: 'GPS Tracking', icon: MapIcon },
  { to: '/fuel-dispatch', label: 'Fuel Dispatch', icon: ClipboardDocumentListIcon },
  { to: '/reports', label: 'Reports', icon: ChartBarSquareIcon },
]

const entitiesNav: NavItem[] = [
  { to: '/entities/oil-companies', label: 'Oil Companies', icon: BuildingOffice2Icon },
  { to: '/entities/transporters', label: 'Transporters', icon: TruckIcon },
  { to: '/entities/depots', label: 'Depots', icon: MapIcon },
]



function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 relative',
          'text-text-muted hover:bg-muted hover:text-text focus-visible:ring-[rgba(28,133,71,0.35)]',
          isActive && 'bg-[#1c8547] text-white shadow-card',
        )
      }
    >
      <Icon className="size-5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

function Sidebar({ onNavigate, role }: { onNavigate?: () => void, role: UserRole }) {
  const filteredEntitiesNav = role === 'DEPOT_ADMIN' 
    ? [] 
    : role === 'OIL_COMPANY_ADMIN' 
      ? entitiesNav.filter(n => n.to !== '/entities/oil-companies')
      : entitiesNav;

  // DEPOT_ADMIN only sees Fuel Dispatch
  const filteredPrimaryNav = role === 'DEPOT_ADMIN'
    ? primaryNav.filter(n => n.to === '/fuel-dispatch')
    : primaryNav;

  return (
    <div className="flex h-full flex-col bg-white overflow-y-auto">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid size-10 place-items-center overflow-hidden rounded-lg bg-white">
          <img
            src={logo}
            alt="Company logo"
            className="size-10 object-cover"
          />
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-text">
            {role === 'EPA_ADMIN' ? 'PEA ETHIOPIA' : role === 'DEPOT_ADMIN' ? 'DEPOT PORTAL' : 'OIL COMPANY'}
          </div>
          <div className="truncate text-xs text-text-muted">
            {role === 'DEPOT_ADMIN' ? 'Delivery Confirmation' : 'Ops Command Center'}
          </div>
        </div>
      </div>

      <div className="px-3 py-2 flex-1">
        <div className="space-y-1">
          {filteredPrimaryNav.map((item) => (
            <NavItemLink key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>

        {filteredEntitiesNav.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              {role === 'OIL_COMPANY_ADMIN' ? 'Company Resources' : 'Stakeholders'}
            </div>

            <div className="space-y-1">
              {filteredEntitiesNav.map((item) => (
                <NavItemLink key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [globalSearch, setGlobalSearch] = useState('')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getPageTitle = (pathname: string): string => {
    if (pathname === '/dashboard' || pathname === '/') return 'Operations Overview'
    if (pathname === '/tracking') return 'GPS Real-time Tracking'
    if (pathname === '/fuel-dispatch') return 'Fuel Dispatch'
    if (pathname === '/reports') return 'Reports'
    if (pathname.includes('/entities/oil-companies')) return 'Oil Companies'
    if (pathname.includes('/entities/transporters')) return 'Transporters'
    if (pathname.includes('/entities/depots')) return 'Depots'
    if (pathname === '/settings') return 'Settings'
    if (pathname === '/profile') return 'Profile'
    return 'Dashboard'
  }

  const title = useMemo(() => getPageTitle(location.pathname), [location.pathname])
  const isTracking = location.pathname === '/tracking'
  const role = user?.role || 'EPA_ADMIN'

  return (
    <div className="h-full bg-white">
      <div className="flex h-full">

        {/* Desktop Sidebar */}
        {!isTracking && (
          <aside className="hidden w-70 shrink-0 border-r border-[#D1D5DB] bg-white shadow-[2px_0_12px_rgba(0,0,0,0.04)] md:block">
            <Sidebar role={role} />
          </aside>
        )}

        {/* Toggle button when sidebar is hidden (e.g. GPS Tracking) */}
        {/* Removed from absolute overlay, moved to header */}

        {/* Slide-in Sidebar (all screen sizes when open) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50">
            <button
              className="absolute inset-0 bg-text/50"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-70 border-r border-[#D1D5DB] bg-white">
              <Sidebar role={role} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col bg-bg overflow-hidden">

          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-[#D1D5DB] bg-white">
            <div className="flex items-center justify-between gap-4 px-6 py-4">

              <div className="flex items-center gap-4">
                <button
                  className={cn("border px-3 py-2 rounded-lg", !isTracking && "md:hidden")}
                  onClick={() => setMobileOpen(true)}
                >
                  <span className="hidden md:block">☰ Menu</span>
                  <span className="md:hidden">Menu</span>
                </button>

                <h2 className="text-sm font-semibold text-text">{title}</h2>
              </div>

              <div className="hidden flex-1 px-6 lg:block">
                {!isTracking && (
                  <div className="relative max-w-xl mx-auto">
                    <input
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                      placeholder="Search dispatches, vehicles, or depots..."
                      className="w-full rounded-xl border border-[#D1D5DB] bg-muted/40 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">


                {/* Profile Dropdown */}
                <div className="relative group text-left">
                  <button className="flex items-center gap-3 py-2 cursor-pointer">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-text">
                        {user?.email ? user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'User'}
                      </div>
                      <div className="text-xs text-text-muted">{role === 'EPA_ADMIN' ? 'PEA Admin' : 'Company Admin'}</div>
                    </div>

                    {role === 'EPA_ADMIN' ? (
                      <img
                        src={profileImg}
                        alt="User profile"
                        className="h-10 w-10 rounded-full object-cover border border-[#D1D5DB]"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                    )}
                  </button>

                  <div className="absolute right-0 top-full mt-0 w-48 bg-white border border-gray-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                    <div className="py-1">
                      <button
                         onClick={() => navigate('/profile')}
                         className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                         Profile
                      </button>
                      <button
                         onClick={() => navigate('/settings')}
                         className="block w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                         Settings
                      </button>
                      <div className="my-1 border-t border-gray-100"></div>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </header>

          <main className={cn("flex-1 bg-bg overflow-y-auto", isTracking && "p-0 overflow-hidden")}>
            <div className={cn("mx-auto w-full h-full", isTracking ? "max-w-none" : "max-w-7xl p-4 sm:p-6")}>
              <Outlet />
            </div>
          </main>

        </div>
      </div>
    </div>
  )
}