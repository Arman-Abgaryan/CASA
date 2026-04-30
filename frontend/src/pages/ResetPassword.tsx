import { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Paper,
  Button,
  Stack,
  TextField,
  IconButton,
  InputAdornment,
  Link,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE } from "../axiosConfig";
import AnimatedPage from "../components/AnimatedPage";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setMessage("Missing or invalid reset link.");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const text = await res.text();
      setMessage(text);
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch {
      setMessage("Error connecting to server");
    } finally {
      setLoading(false);
    }
  }

  const formDisabled = success || !token;

  return (
    <AnimatedPage>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          px: 2,
          py: 4,
          background: "linear-gradient(180deg, #f7fbfb 0%, #eef6f6 100%)",
        }}
      >
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 5 }, width: "100%", maxWidth: 420, borderRadius: 4, boxShadow: 5 }}>
          <Typography variant="h6" fontWeight="bold" mb={1} textAlign="center" fontSize={{ xs: 26, sm: 28 }}>
            Reset Password
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            Choose a new password for your account.
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="New Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={formDisabled}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((p) => !p)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Confirm New Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={formDisabled}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || formDisabled}
              sx={{ borderRadius: 5, py: 1.2 }}
            >
              {loading ? "Resetting..." : success ? "Password Reset" : "Reset Password"}
            </Button>

            {message && (
              <Typography
                variant="body2"
                textAlign="center"
                sx={{ color: success ? "success.main" : "error.main" }}
              >
                {message}
              </Typography>
            )}

            <Typography variant="body2" textAlign="center" sx={{ mt: 1 }}>
              <Link component="button" type="button" onClick={() => navigate("/login")}>
                Back to login
              </Link>
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </AnimatedPage>
  );
}
