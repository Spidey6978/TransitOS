import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  MapPin,
  Wallet,
  LogOut,
  ScanLine,
  PanelLeftClose,
  PanelLeftOpen,
  CarFront,
  Navigation,
  Map
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  // Admin & General
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { href: '/map', label: 'Traffic Map', icon: Map, roles: ['admin', 'user'] },

  // User Specific
  { href: '/book', label: 'Book Trip', icon: MapPin, roles: ['user'] },
  { href: '/wallets', label: 'Wallets', icon: Wallet, roles: ['user'] },

  // Conductor & Driver
  { href: '/validate', label: 'Validator', icon: ScanLine, roles: ['conductor', 'driver'] },
  { href: '/driver/active', label: 'Active Trip', icon: Navigation, roles: ['driver'] },

]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const role = localStorage.getItem('transitos_role')

  // Filter items based on the logged-in user's role
  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role))

  function handleLogout() {
    localStorage.removeItem('transitos_role')
    navigate('/')
  }

  return (
    <div className="relative flex shrink-0">
      {/* Floating Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-4 top-16 z-50 w-8 h-8 rounded-lg flex items-center justify-center",
          "bg-slate-900 border border-white/10 shadow-md",
          "text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all duration-150"
        )}
      >
        {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
      </button>

      {/* Sidebar Container */}
      <aside className={cn(
        "relative h-screen flex flex-col",
        "bg-slate-900/40 backdrop-blur-md border-r border-white/10",
        "transition-all duration-300 overflow-hidden",
        collapsed ? "w-16" : "w-64"
      )}>
        
        {/* Logo Section */}
        <div className={cn(
          "flex items-center border-b border-white/10 shrink-0",
          collapsed ? "justify-center px-0 py-5" : "px-5 py-5 gap-3"
        )}>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <CarFront className="w-6 h-6 text-cyan-400" />
          </div>
          {!collapsed && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-sm font-bold text-cyan-400 tracking-widest uppercase leading-tight">
                TransitOS
              </h1>
              <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-0.5">
                {role} Portal
              </p>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {visibleItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <NavLink
                key={`${item.href}-${idx}`}
                to={item.href}
                title={collapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <div className={cn(
                    "flex items-center rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 border",
                    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                    isActive
                      ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/40"
                      : "text-slate-400 hover:bg-white/5 hover:text-white border-transparent"
                  )}>
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && (
                      <span className="tracking-wide whitespace-nowrap">{item.label}</span>
                    )}
                  </div>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Logout Section */}
        <div className={cn(
          "border-t border-white/10 shrink-0",
          collapsed ? "px-2 py-4" : "px-3 py-4"
        )}>
          {collapsed ? (
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-full flex items-center justify-center py-2.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          )}
        </div>
      </aside>
    </div>
  )
}