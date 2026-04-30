import { useState } from "react";
import { Typography, Box, Paper, Button, Stack, TextField, Link } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../axiosConfig";
import AnimatedPage from "../components/AnimatedPage";

export default function Signup() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      const text = await res.text();
      setMessage(text);
      if (res.ok) setTimeout(() => navigate("/login"), 1200);
    } catch {
      setMessage("Error connecting to server");
    }
  }

  return (
    <AnimatedPage>
      <Box
        component="form"
        onSubmit={handleSignup}
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
          <Typography variant="h6" fontWeight="bold" mb={2} textAlign="center" fontSize={{ xs: 26, sm: 28 }}>
            Create Account
          </Typography>

          <Stack spacing={2}>
            <TextField label="First Name" fullWidth value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <TextField label="Last Name" fullWidth value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <TextField label="Email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField label="Password" type="password" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />

            <Button type="submit" variant="contained" fullWidth sx={{ borderRadius: 5, py: 1.2 }}>
              Sign Up
            </Button>

            <Typography variant="body2" textAlign="center" sx={{ mt: 1 }}>
              Already have an account? <Link component="button" onClick={() => navigate("/login")}>Login</Link>
            </Typography>

            <Typography textAlign="center" sx={{ mt: 2 }}>{message}</Typography>
          </Stack>
        </Paper>
      </Box>
    </AnimatedPage>
  );
}
