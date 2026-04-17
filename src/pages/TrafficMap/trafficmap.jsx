export default function TrafficMap() {
  return (
    <div className="w-full h-[calc(100vh-60px)] bg-slate-950">
      <iframe 
        src="https://transitos-aw5w.onrender.com/?embed=true" 
        className="w-full h-full border-none"
        title="TransitOS Traffic Mesh"
        allow="autoplay; fullscreen"
      />
    </div>
  )
}