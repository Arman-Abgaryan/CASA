import { useState } from "react";
import { AppBar, Avatar, Box, IconButton, Menu, MenuItem, Toolbar, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

interface Props {
  onMenuClick: () => void;
}

export default function MobileAppHeader({ onMenuClick }: Props) {
  const navigate = useNavigate();
  const { isLoggedIn, setIsLoggedIn, profileImageUrl } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleLogout = () => {
    setAnchorEl(null);
    localStorage.clear();
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        display: { xs: "block", md: "none" },
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(10px)",
        zIndex: (theme) => theme.zIndex.drawer + 2,
      }}
    >
      <Toolbar
        sx={{
          minHeight: "72px !important",
          px: 2,
          gap: 1,
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton edge="start" onClick={onMenuClick} sx={{ mr: 0.5 }}>
            <MenuIcon />
          </IconButton>
          <Box onClick={() => navigate("/dashboard")} sx={{ cursor: "pointer" }}>
            <Typography fontWeight={900} fontSize={24} color="#052e30" letterSpacing={0.5}>
              CASA
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton size="small" aria-label="search">
            <SearchIcon />
          </IconButton>
          <IconButton size="small" aria-label="notifications">
            <NotificationsNoneIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => (!isLoggedIn ? navigate("/login") : setAnchorEl(e.currentTarget))}
            sx={{ p: 0.25, ml: 0.25 }}
            aria-label="account"
          >
            <Avatar src={profileImageUrl ?? undefined} sx={{ width: 30, height: 30, bgcolor: "#bdbdbd" }} />
          </IconButton>
        </Box>

        <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
          {!isLoggedIn && (
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate("/login");
              }}
            >
              Login
            </MenuItem>
          )}
          {isLoggedIn && (
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate("/profile");
              }}
            >
              Profile
            </MenuItem>
          )}
          {isLoggedIn && <MenuItem onClick={handleLogout}>Logout</MenuItem>}
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
