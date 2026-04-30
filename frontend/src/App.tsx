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
import Landing from "./pages/Landing";
import { AuthProvider } from "./AuthContext";

const publicPaths = ["/", "/login", "/signup"];

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
            overflow: isPublicPage ? "visible" : "auto",
            ml: { xs: 0, md: isPublicPage ? 0 : "240px" },
            pt: isPublicPage ? 0 : { xs: 10, md: 0 },
            p: isPublicPage ? 0 : { xs: 2, sm: 3 },
          }}
        >
          <Routes>
            <Route path="/" element={<Landing />} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </AuthProvider>
  );
}
