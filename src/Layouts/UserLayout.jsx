import Sidebar from '../components/ui/shared/sidebar'
import Topbar from '../components/ui/shared/topbar'

export default function UserLayout({ children }) {
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