import Topbar from '../components/ui/shared/topbar'

export default function ConductorLayout({ children }) {
  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}