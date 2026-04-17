/**
 * DriverLayout.jsx  —  src/Layouts/DriverLayout.jsx
 *
 * Identical structure to AdminLayout / UserLayout / ConductorLayout.
 * Renders the shared Sidebar + Topbar.  The sidebar's NAV_ITEMS role filter
 * automatically shows only the driver-role tabs (Active Trip, Wallet, Validator).
 *
 * Dependent files (no changes needed):
 *   src/components/ui/shared/sidebar.jsx  ← modified to include driver nav items
 *   src/components/ui/shared/topbar.jsx   ← unchanged
 */

import Sidebar from '../components/ui/shared/sidebar'
import Topbar  from '../components/ui/shared/topbar'

export default function DriverLayout({ children }) {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}