import { AppBar, Box, IconButton, Toolbar, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";

interface Props {
  onMenuClick: () => void;
}

export default function MobileAppHeader({ onMenuClick }: Props) {
  const navigate = useNavigate();

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
      }}
    >
      <Toolbar sx={{ minHeight: "64px !important", px: 2 }}>
        <IconButton edge="start" onClick={onMenuClick} sx={{ mr: 1 }}>
          <MenuIcon />
        </IconButton>
        <Box onClick={() => navigate("/dashboard")} sx={{ cursor: "pointer" }}>
          <Typography fontWeight={900} fontSize={24} color="#052e30">
            CASA
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
