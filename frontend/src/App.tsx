import { Box } from "@mui/material";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import MobileAppHeader from "./components/MobileAppHeader";
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
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import ProtectedRoute from "./components/ProtectedRoute";
import AIChatWidget from "./components/AIChatWidget";
import { AuthProvider } from "./AuthContext";

const publicPaths = ["/", "/login", "/signup", "/forgot-password", "/reset-password"];

export default function App() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isPublicPage = useMemo(() => publicPaths.includes(location.pathname), [location.pathname]);

  return (
    <AuthProvider>
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: isPublicPage ? "#f7fbfb" : "#f8fafc" }}>
        {!isPublicPage && (
          <>
            <MobileAppHeader onMenuClick={() => setMobileOpen(true)} />
            <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
          </>
        )}

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            width: "100%",
            overflow: isPublicPage ? "visible" : "auto",
            ml: 0,
            pt: isPublicPage ? 0 : { xs: "84px", sm: "92px", md: 0 },
            px: isPublicPage ? 0 : { xs: 2, sm: 3, md: 4 },
            pb: isPublicPage ? 0 : { xs: 3, sm: 4 },
          }}
        >
          <Routes>
            {/* Public routes — accessible without signing in */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes — require sign in */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/budgets"
              element={
                <ProtectedRoute>
                  <Budgets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute>
                  <Goals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <Report />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/help"
              element={
                <ProtectedRoute>
                  <Help />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>

        {/* Floating AI advisor — only on protected (signed-in) pages. */}
        {!isPublicPage && <AIChatWidget />}
      </Box>
    </AuthProvider>
  );
}
