import { useState } from "react";
import { Typography, Box, Paper, Button, Stack, TextField, Link } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../axiosConfig";
import AnimatedPage from "../components/AnimatedPage";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const text = await res.text();
      setMessage(text);
      setSubmitted(true);
    } catch {
      setMessage("Error connecting to server");
    } finally {
      setLoading(false);
    }
  }

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
            Forgot Password
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            Enter your email and we'll send you a link to reset your password.
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitted}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || submitted}
              sx={{ borderRadius: 5, py: 1.2 }}
            >
              {loading ? "Sending..." : submitted ? "Email Sent" : "Send Reset Link"}
            </Button>

            {message && (
              <Typography
                variant="body2"
                textAlign="center"
                sx={{ color: submitted ? "success.main" : "error.main" }}
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
