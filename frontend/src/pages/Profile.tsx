import { useState, useRef, useEffect } from "react";
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import VerifiedIcon from "@mui/icons-material/Verified";
import LogoutIcon from "@mui/icons-material/Logout";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import api from "../axiosConfig";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { key: "profile", label: "My Profile", icon: <PersonOutlineIcon fontSize="small" /> },
  { key: "security", label: "Security", icon: <LockOutlinedIcon fontSize="small" /> },
];

export default function Profile() {
  const firstName = localStorage.getItem("firstName") || "";
  const lastName = localStorage.getItem("lastName") || "";
  const email = localStorage.getItem("email") || "";
  const navigate = useNavigate();

  const { profileImageUrl, setProfileImageUrl, setIsLoggedIn } = useAuth();

  const [selectedPanel, setSelectedPanel] = useState<string>("profile");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [budgetCount, setBudgetCount] = useState<number | null>(null);
  const [goalCount, setGoalCount] = useState<number | null>(null);
  const [txCount, setTxCount] = useState<number | null>(null);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/api/budgets").then(res => setBudgetCount(res.data.length)).catch(() => {});
    api.get("/api/goals").then(res => setGoalCount(res.data.length)).catch(() => {});
    api.get("/api/transactions").then(res => setTxCount(res.data.length)).catch(() => {});
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage({ type: "error", text: "Please select an image file." }); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage({ type: "error", text: "Image must be under 5MB." }); return; }

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setMessage(null);

    try {
      const res = await api.post("/api/users/profile-picture", formData, { headers: { "Content-Type": "multipart/form-data" } });
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

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    navigate("/login");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: "error", text: "Please fill all fields." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }

    setChangingPassword(true);
    setPasswordMessage(null);
    try {
      await api.put("/api/users/change-password", { currentPassword, newPassword });
      setPasswordMessage({ type: "success", text: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordMessage({ type: "error", text: "Current password is incorrect." });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.delete("/api/users/account");
      localStorage.clear();
      setIsLoggedIn(false);
      navigate("/login");
    } catch {
      setDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={3}>Profile</Typography>

      <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>

        {/* LEFT SIDEBAR */}
        <Paper variant="outlined" sx={{ width: 240, flexShrink: 0, p: 2.5, borderRadius: "16px" }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar src={profileImageUrl ?? undefined} sx={{ width: 72, height: 72, bgcolor: "#bdbdbd" }} />
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="small"
                sx={{ position: "absolute", bottom: -2, right: -2, bgcolor: "white", border: "1px solid #e0e0e0", p: 0.4, "&:hover": { bgcolor: "#f5f5f5" } }}
              >
                {uploading ? <CircularProgress size={13} /> : <CameraAltOutlinedIcon sx={{ fontSize: 13 }} />}
              </IconButton>
            </Box>

            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleUpload} />

            <Typography sx={{ mt: 1.5, fontWeight: 600, fontSize: 15 }}>{firstName} {lastName}</Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3 }}>
              <VerifiedIcon sx={{ fontSize: 13, color: "#1976d2" }} />
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Verified account</Typography>
            </Box>

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

            {message && (
              <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
                {message.type === "success" ? <CheckCircleIcon sx={{ fontSize: 13, color: "success.main" }} /> : <ErrorOutlineIcon sx={{ fontSize: 13, color: "error.main" }} />}
                <Typography variant="caption" color={message.type === "success" ? "success.main" : "error.main"}>{message.text}</Typography>
              </Stack>
            )}
          </Box>

          <Divider sx={{ my: 1 }} />

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
                    color: active ? "#052e30" : "text.secondary",
                    background: active ? "rgba(5,46,48,0.06)" : "transparent",
                    border: `1px solid ${active ? "rgba(5,46,48,0.2)" : "transparent"}`,
                    "&:hover": { background: active ? "rgba(5,46,48,0.08)" : "rgba(0,0,0,0.04)" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                      <Box sx={{ color: active ? "#052e30" : "text.secondary", display: "flex" }}>{item.icon}</Box>
                      <Typography sx={{ fontSize: 13.5, fontWeight: active ? 600 : 400 }}>{item.label}</Typography>
                    </Box>
                    {active && <ArrowForwardIosIcon sx={{ fontSize: 11 }} />}
                  </Box>
                </Button>
              );
            })}
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Button
            fullWidth
            startIcon={<LogoutIcon fontSize="small" />}
            onClick={handleLogout}
            sx={{ textTransform: "none", justifyContent: "flex-start", px: 1.5, py: 1.2, borderRadius: "10px", color: "error.main", "&:hover": { background: "rgba(211,47,47,0.04)" } }}
          >
            <Typography sx={{ fontSize: 13.5 }}>Logout</Typography>
          </Button>
        </Paper>

        {/* RIGHT CONTENT PANEL */}
        <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: 3.5, borderRadius: "16px" }}>

          {/* MY PROFILE PANEL */}
          {selectedPanel === "profile" && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={0.5}>My Profile</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Your personal information</Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, mb: 3.5 }}>
                {[
                  { label: "Transactions", value: txCount ?? "—" },
                  { label: "Budgets", value: budgetCount ?? "—" },
                  { label: "Goals", value: goalCount ?? "—" },
                ].map((stat) => (
                  <Box key={stat.label} sx={{ border: "1px solid #e0e0e0", borderRadius: "12px", p: 2, textAlign: "center" }}>
                    <Typography fontWeight={700} fontSize={20} color="#1976d2">{stat.value}</Typography>
                    <Typography fontSize={11.5} color="text.secondary" mt={0.3}>{stat.label}</Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              <Stack spacing={2}>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>First Name</Typography>
                    <Typography variant="body1" fontWeight={500}>{firstName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>Last Name</Typography>
                    <Typography variant="body1" fontWeight={500}>{lastName}</Typography>
                  </Box>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>Email Address</Typography>
                  <Typography variant="body1" fontWeight={500}>{email}</Typography>
                </Box>
              </Stack>
            </Box>
          )}

          {/* SECURITY PANEL */}
          {selectedPanel === "security" && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Security</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Manage your password and account</Typography>

              {/* Change Password */}
              <Typography variant="subtitle2" fontWeight={700} mb={2}>Change Password</Typography>
              <Stack spacing={2} mb={3}>
                <TextField
                  label="Current Password"
                  type="password"
                  size="small"
                  fullWidth
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <TextField
                  label="New Password"
                  type="password"
                  size="small"
                  fullWidth
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  size="small"
                  fullWidth
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {passwordMessage && (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    {passwordMessage.type === "success" ? <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} /> : <ErrorOutlineIcon sx={{ fontSize: 14, color: "error.main" }} />}
                    <Typography variant="caption" color={passwordMessage.type === "success" ? "success.main" : "error.main"}>{passwordMessage.text}</Typography>
                  </Stack>
                )}
                <Button
                  variant="contained"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  sx={{ alignSelf: "flex-start", backgroundColor: "#052e30", "&:hover": { backgroundColor: "#0a3d3f" }, textTransform: "none" }}
                >
                  {changingPassword ? <CircularProgress size={18} color="inherit" /> : "Update Password"}
                </Button>
              </Stack>

              <Divider sx={{ my: 3 }} />

              {/* Danger Zone */}
              <Box sx={{ border: "1px solid #ffcdd2", borderRadius: "12px", p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <WarningAmberIcon sx={{ color: "error.main", fontSize: 18 }} />
                  <Typography variant="subtitle2" fontWeight={700} color="error.main">Danger Zone</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                  sx={{ textTransform: "none", borderRadius: "8px" }}
                >
                  Delete Account
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to permanently delete your account? All your transactions, budgets, and goals will be lost forever.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteAccount} disabled={deletingAccount}>
            {deletingAccount ? <CircularProgress size={18} color="inherit" /> : "Delete Forever"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
