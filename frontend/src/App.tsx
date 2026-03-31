import { useEffect } from "react";
import { Box } from "@mui/material";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Budgets from "./pages/Budgets";
import Goals from "./pages/Goals";
import Transactions from "./pages/Transactions";
import Report from "./pages/Report";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { AuthProvider } from "./AuthContext";

export default function App() {
  const location = useLocation();

  return (
    <AuthProvider>
      <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* {!hideSidebar && <Sidebar />} */}
        <Sidebar />

        <Box component="main" sx={{ flex: 1, overflow: "auto", p: 3 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/report" element={<Report />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </Box>
      </Box>
    </AuthProvider>
  );
}