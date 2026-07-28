import { Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import AuthGuard from "./components/AuthGuard"

// Layouts
import AdminLayout from "./Layouts/AdminLayout"
import ConductorLayout from "./Layouts/ConductorLayout"
import UserLayout from "./Layouts/UserLayout"
import DriverLayout from "./Layouts/DriverLayout"
import ActiveTrip from "./pages/Driver/ActiveTrip"

// Pages
import Dashboard from "./pages/Dashboard/dashboard"
import BookTrip from "./pages/Booktrip/booktrip"
import Wallets from "./pages/Wallets/wallets"
import QRValidator from "./pages/QRValidator/validator"
import TrafficMap from "./pages/TrafficMap/trafficmap"

// ... (imports remain the same)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Admin Routes */}
      <Route path="/dashboard" element={
        <AuthGuard roles={["admin"]}>
          <AdminLayout><Dashboard /></AdminLayout>
        </AuthGuard>
      }/>

      {/* Driver Routes */}
      <Route path="/driver/active" element={
        <AuthGuard roles={["driver"]}>
          <DriverLayout><ActiveTrip /></DriverLayout>
        </AuthGuard>
      }/>

      {/* Traffic Map - Restricted to admin and user only */}
      <Route path="/map" element={
        <AuthGuard roles={["admin", "user"]}>
          <AdminLayout><TrafficMap /></AdminLayout>
        </AuthGuard>
      }/>

      {/* User Routes */}
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

      {/* Validator - Now accessible by conductor AND driver */}
      <Route path="/validate" element={
        <AuthGuard roles={["conductor", "driver"]}>
          {/* Dynamically choose layout based on role */}
          {localStorage.getItem('transitos_role') === 'driver' ? (
            <DriverLayout><QRValidator /></DriverLayout>
          ) : (
            <ConductorLayout><QRValidator /></ConductorLayout>
          )}
        </AuthGuard>
      }/>
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
