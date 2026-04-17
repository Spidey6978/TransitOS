import { useState } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Topbar() {
  const [notifOpen, setNotifOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const role = localStorage.getItem('transitos_role') ?? 'guest'

  function handleSignOut() {
    localStorage.removeItem('transitos_role')
    window.location.href = '/'
  }

  return (
    <header className={cn(
      "h-14 w-full flex items-center justify-end px-6 gap-3",
      "border-b border-white/10 bg-slate-900/40 backdrop-blur-md shrink-0"
    )}>

      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen(!notifOpen); setAvatarOpen(false) }}
          className={cn(
            "relative w-9 h-9 rounded-lg flex items-center justify-center",
            "text-slate-400 hover:text-cyan-400 hover:bg-white/5",
            "border border-transparent hover:border-white/10",
            "transition-all duration-150"
          )}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-11 w-72 bg-slate-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-xs font-semibold text-slate-300 tracking-widest uppercase">
                Notifications
              </p>
            </div>
            <div className="px-4 py-3 text-xs text-slate-500 tracking-wide">
              No new notifications
            </div>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="relative">
        <button
          onClick={() => { setAvatarOpen(!avatarOpen); setNotifOpen(false) }}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            "bg-cyan-500/10 border border-cyan-500/30",
            "text-cyan-400 hover:bg-cyan-500/20",
            "transition-all duration-150 font-bold text-sm uppercase tracking-wider"
          )}
        >
          {role.charAt(0)}
        </button>

        {avatarOpen && (
          <div className="absolute right-0 top-11 w-44 bg-slate-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-xs text-slate-400 tracking-widest uppercase">
                {role}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

    </header>
  )
}