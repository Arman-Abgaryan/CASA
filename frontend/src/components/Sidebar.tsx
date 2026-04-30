import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import FlagIcon from "@mui/icons-material/Flag";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import { NavLink, useLocation } from "react-router-dom";
import AIChatWidget from "./AIChatWidget";

const drawerWidth = 240;

const items = [
  { to: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { to: "/budgets", label: "Budgets", icon: <AccountBalanceWalletIcon /> },
  { to: "/goals", label: "Goals", icon: <FlagIcon /> },
  { to: "/transactions", label: "Transactions", icon: <ReceiptLongIcon /> },
  { to: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

interface Props {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();

  return (
    <>
      <Toolbar sx={{ minHeight: 64 }}>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ color: "white", fontFamily: "'Raleway', sans-serif", fontSize: 25, mb: -2 }}
        >
          CASA
        </Typography>
      </Toolbar>

      <List sx={{ px: 1 }}>
        {items.map(({ to, label, icon }) => {
          const active = pathname === to;
          return (
            <ListItemButton
              key={to}
              component={NavLink}
              to={to}
              onClick={onNavigate}
              sx={{
                color: "white",
                mb: 0.5,
                borderRadius: 2,
                backgroundColor: active ? "rgba(255,255,255,0.08)" : "transparent",
                transition: "background-color 0.25s ease, transform 0.25s ease",
                "&:hover": { backgroundColor: "#1a4d4f", transform: "translateX(4px)" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "white" }}>{icon}</ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{ fontFamily: "'Open Sans', sans-serif" }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ my: -0.6, borderColor: "rgba(255,255,255,0.12)" }} />

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, px: 1, pb: 2, pt: 2 }}>
        <AIChatWidget />
      </Box>
    </>
  );
}

export default function Sidebar({ mobileOpen, onMobileClose }: Props) {
  return (
    <>
      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#052e30",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <SidebarContent />
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#052e30",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <SidebarContent onNavigate={onMobileClose} />
      </Drawer>
    </>
  );
}
