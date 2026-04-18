// src/pages/QRValidator/ScannedHistory.jsx
import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Ticket } from 'lucide-react'
import api from "@/service/api" // Existing API instance [cite: 294, 212]

export default function ScannedHistory() {
  const [history, setHistory] = useState([])

  useEffect(() => {
    // Fetches the global ledger which contains all validated transactions 
    api.get('/ledger_live')
      .then(res => setHistory(res.data))
      .catch(err => console.error("Failed to fetch scan history", err))
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
          <Ticket className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Scan History</h1>
          <p className="text-slate-500 text-sm">Review recently validated passenger tickets</p>
        </div>
      </div>

      <Card className="border-white/10 bg-slate-900/40 backdrop-blur-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Time</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Commuter</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Route</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Mode</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((t, idx) => (
                <TableRow key={t.hash || idx} className="border-white/5 hover:bg-white/[0.02]">
                  <TableCell className="text-xs text-slate-400 font-mono">
                    {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-white">{t.commuter_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-slate-300">
                      <span>{t.start_station}</span>
                      <span className="text-slate-600">→</span>
                      <span>{t.end_station}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[9px]">
                      {t.mode.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[10px] font-bold text-green-400 flex items-center justify-end gap-1">
                      <div className="w-1 h-1 rounded-full bg-green-400" />
                      VALIDATED
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {history.length === 0 && (
            <div className="py-20 text-center text-slate-600 text-sm">No tickets scanned yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}