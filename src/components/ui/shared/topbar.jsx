import { useState } from 'react'
import { Bell, LogOut, Shield, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

export default function Topbar() {
  const [notifOpen, setNotifOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const navigate = useNavigate()

  // Retrieve role - ensure it defaults to a string for charAt(0) to work
  const role = localStorage.getItem('transitos_role') || 'guest'

  function handleSignOut() {
    localStorage.removeItem('transitos_role')
    setAvatarOpen(false)
    navigate('/')
  }

  return (
    <header className={cn(
      "h-14 w-full flex items-center justify-end px-6 gap-3",
      "border-b border-white/10 bg-slate-900/40 backdrop-blur-md shrink-0",
      "relative z-[40]" // Ensures topbar stays above general content
    )}>

      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen(!notifOpen); setAvatarOpen(false) }}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-11 w-72 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-xs font-semibold text-slate-300 tracking-widest uppercase">Notifications</p>
            </div>
            <div className="px-4 py-8 text-xs text-slate-500 text-center">No new notifications</div>
          </div>
        )}
      </div>

      {/* Avatar & Dropdown Menu */}
      <div className="relative">
        <button
          onClick={() => { setAvatarOpen(!avatarOpen); setNotifOpen(false) }}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all font-bold text-sm uppercase"
        >
          {role.charAt(0)}
        </button>

        {avatarOpen && (
          /* FIX: Added z-[100] and relative positioning to ensure it's on top of EVERYTHING */
          <div className="absolute right-0 top-11 w-52 bg-slate-950 border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] overflow-hidden">
            
            {/* Access Level Header - Now shows for ALL roles including Conductor */}
            <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                <p className="text-[10px] text-slate-500 tracking-widest uppercase font-bold">Access Level</p>
              </div>
              <p className="text-sm text-white font-semibold capitalize">
                {role} Account
              </p>
            </div>

            {/* Menu Options */}
            <div className="p-1">
              <button className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-400 cursor-not-allowed">
                <User className="w-3.5 h-3.5" />
                Profile Settings
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}