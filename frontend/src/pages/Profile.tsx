import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Stack,
  Button,
  Avatar,
  IconButton,
  CircularProgress,
  Chip,
} from "@mui/material";

import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import VerifiedIcon from "@mui/icons-material/Verified";

import api from "../axiosConfig";
import { useAuth } from "../AuthContext";

const NAV_ITEMS = [
  { key: "profile", label: "My Profile", icon: <PersonOutlineIcon fontSize="small" /> },
];

export default function Profile() {
  const firstName = localStorage.getItem("firstName") || "";
  const lastName = localStorage.getItem("lastName") || "";
  const email = localStorage.getItem("email") || "";

  const { profileImageUrl, setProfileImageUrl } = useAuth();

  const [selectedPanel, setSelectedPanel] = useState<string>("profile");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be under 5MB." });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setMessage(null);

    try {
      const res = await api.post("/api/users/profile-picture", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data.url;
      setProfileImageUrl(url);
      localStorage.setItem("profileImageUrl", url);
      setMessage({ type: "success", text: "Profile picture updated." });
    } catch {
      setMessage({ type: "error", text: "Failed to upload image. Try again." });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setMessage(null);
    try {
      await api.delete("/api/users/profile-picture");
      setProfileImageUrl(null);
      localStorage.removeItem("profileImageUrl");
      setMessage({ type: "success", text: "Profile picture removed." });
    } catch {
      setMessage({ type: "error", text: "Failed to remove picture. Try again." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={3}>
        Profile
      </Typography>

      <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>

        {/* ── LEFT SIDEBAR ── */}
        <Paper
          variant="outlined"
          sx={{ width: 240, flexShrink: 0, p: 2.5, borderRadius: "16px" }}
        >
          {/* Avatar block */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={profileImageUrl ?? undefined}
                sx={{ width: 72, height: 72, bgcolor: "#bdbdbd" }}
              />
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="small"
                sx={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  bgcolor: "white",
                  border: "1px solid #e0e0e0",
                  p: 0.4,
                  "&:hover": { bgcolor: "#f5f5f5" },
                }}
              >
                {uploading
                  ? <CircularProgress size={13} />
                  : <CameraAltOutlinedIcon sx={{ fontSize: 13 }} />}
              </IconButton>
            </Box>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleUpload}
            />

            <Typography sx={{ mt: 1.5, fontWeight: 600, fontSize: 15 }}>
              {firstName} {lastName}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3 }}>
              <VerifiedIcon sx={{ fontSize: 13, color: "#1976d2" }} />
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Verified account</Typography>
            </Box>

            {/* Remove picture button */}
            {profileImageUrl && (
              <Button
                size="small"
                startIcon={deleting ? <CircularProgress size={12} /> : <DeleteOutlineIcon />}
                onClick={handleDelete}
                disabled={deleting}
                sx={{ textTransform: "none", color: "error.main", fontSize: 11, mt: 0.5 }}
              >
                Remove picture
              </Button>
            )}

            {/* Feedback message */}
            {message && (
              <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
                {message.type === "success"
                  ? <CheckCircleIcon sx={{ fontSize: 13, color: "success.main" }} />
                  : <ErrorOutlineIcon sx={{ fontSize: 13, color: "error.main" }} />}
                <Typography variant="caption" color={message.type === "success" ? "success.main" : "error.main"}>
                  {message.text}
                </Typography>
              </Stack>
            )}
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Nav items */}
          <Stack spacing={0.5} mt={1}>
            {NAV_ITEMS.map((item) => {
              const active = selectedPanel === item.key;
              return (
                <Button
                  key={item.key}
                  fullWidth
                  onClick={() => setSelectedPanel(item.key)}
                  sx={{
                    textTransform: "none",
                    justifyContent: "flex-start",
                    px: 1.5,
                    py: 1.2,
                    borderRadius: "10px",
                    color: active ? "#1976d2" : "text.secondary",
                    background: active ? "rgba(25,118,210,0.06)" : "transparent",
                    border: `1px solid ${active ? "rgba(25,118,210,0.2)" : "transparent"}`,
                    "&:hover": {
                      background: active ? "rgba(25,118,210,0.08)" : "rgba(0,0,0,0.04)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                      <Box sx={{ color: active ? "#1976d2" : "text.secondary", display: "flex" }}>
                        {item.icon}
                      </Box>
                      <Typography sx={{ fontSize: 13.5, fontWeight: active ? 600 : 400 }}>
                        {item.label}
                      </Typography>
                    </Box>
                    {active && <ArrowForwardIosIcon sx={{ fontSize: 11 }} />}
                  </Box>
                </Button>
              );
            })}
          </Stack>
        </Paper>

        {/* ── RIGHT CONTENT PANEL ── */}
        <Paper
          variant="outlined"
          sx={{ flex: 1, minWidth: 0, p: 3.5, borderRadius: "16px" }}
        >
          {selectedPanel === "profile" && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={0.5}>
                My Profile
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Your personal information
              </Typography>

              {/* Stats strip */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, mb: 3.5 }}>
                {[
                  { label: "Member Since", value: "2025" },
                  { label: "Budgets", value: "—" },
                  { label: "Goals", value: "—" },
                ].map((stat) => (
                  <Box
                    key={stat.label}
                    sx={{
                      border: "1px solid #e0e0e0",
                      borderRadius: "12px",
                      p: 2,
                      textAlign: "center",
                    }}
                  >
                    <Typography fontWeight={700} fontSize={20} color="#1976d2">
                      {stat.value}
                    </Typography>
                    <Typography fontSize={11.5} color="text.secondary" mt={0.3}>
                      {stat.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              {/* Info fields */}
              <Stack spacing={2}>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
                      First Name
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>{firstName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
                      Last Name
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>{lastName}</Typography>
                  </Box>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
                    Email Address
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>{email}</Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}