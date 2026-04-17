import { Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import AuthGuard from "./components/AuthGuard"
import AdminLayout from "./Layouts/AdminLayout"
import ConductorLayout from "./Layouts/ConductorLayout"
import UserLayout from "./Layouts/UserLayout"
import Dashboard from "./pages/Dashboard/dashboard"
import BookTrip from "./pages/BookTrip/booktrip"
import Wallets from "./pages/Wallets/wallets"
import QRValidator from "./pages/QRValidator/validator"
import TrafficMap from "./pages/TrafficMap/trafficmap"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Admin */}
      <Route path="/dashboard" element={
        <AuthGuard roles={["admin"]}>
          <AdminLayout><Dashboard /></AdminLayout>
        </AuthGuard>
      }/>

      <Route path="/map" element={
        <AuthGuard roles={["admin", "user"]}>
          <AdminLayout><TrafficMap /></AdminLayout>
        </AuthGuard>
      }/>

      {/* User */}
      <Route path="/book" element={
        <AuthGuard roles={["user"]}>
          <UserLayout><BookTrip /></UserLayout>
        </AuthGuard>
      }/>

      <Route path="/wallets" element={
        <AuthGuard roles={["user"]}>
          <UserLayout><Wallets /></UserLayout>
        </AuthGuard>
      }/>

      {/* Conductor */}
      <Route path="/validate" element={
        <AuthGuard roles={["conductor"]}>
          <ConductorLayout><QRValidator /></ConductorLayout>
        </AuthGuard>
      }/>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}