import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  // 🚨 REPLACE THIS with your actual Render URL!
  // Keep ?embed=true to hide Streamlit's top menu bar
  const RENDER_STREAMLIT_URL = "https://your-app-name.onrender.com/?embed=true";
  
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="w-full h-[calc(100vh-60px)] bg-[#030712] relative overflow-hidden">
      
      {/* Loading State while Render wakes up or loads */}
      {isLoading && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-[#030712]">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-white tracking-widest uppercase">Connecting to Telemetry Node</h2>
          <p className="text-sm text-slate-500 mt-2">Establishing secure Web3 data link...</p>
        </div>
      )}

      {/* The Render Iframe */}
      <iframe 
        src={RENDER_STREAMLIT_URL}
        width="100%"
        height="100%"
        frameBorder="0"
        className="w-full h-full border-none relative z-10"
        title="TransitOS Streamlit Dashboard"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
