import { useEffect, useState } from "react";
import { Typography, Box, Paper, Button, Stack, TextField, IconButton } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import InputAdornment from "@mui/material/InputAdornment";
import { API_BASE } from "../axiosConfig";
import AnimatedPage from "../components/AnimatedPage";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("firstName");
    localStorage.removeItem("lastName");
    localStorage.removeItem("email");
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("firstName", data.firstName);
        localStorage.setItem("lastName", data.lastName);
        localStorage.setItem("email", data.email);
        window.location.href = "/dashboard";
        return;
      }

      setMessage(await res.text());
    } catch {
      setMessage("Error connecting to server");
    }
  }

  return (
    <AnimatedPage>
      <Box
        component="form"
        onSubmit={handleLogin}
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
            Login
          </Typography>

          <Stack spacing={2}>
            <TextField label="Email" variant="outlined" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField
              label="Password"
              variant="outlined"
              type={showPassword ? "text" : "password"}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((prev) => !prev)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button type="submit" variant="contained" color="primary" size="large" fullWidth sx={{ borderRadius: 5, py: 1.2 }}>
              Login
            </Button>

            <Typography
              variant="body2"
              sx={{ textAlign: "center", cursor: "pointer", color: "#1976d2" }}
              onClick={() => (window.location.href = "/forgot-password")}
            >
              Forgot password?
            </Typography>

            <Typography variant="body2" sx={{ mt: 2, textAlign: "center", cursor: "pointer" }} onClick={() => (window.location.href = "/signup")}>
              Don’t have an account? <span style={{ color: "#1976d2" }}>Sign up</span>
            </Typography>
          </Stack>

          <Typography mt={2} textAlign="center" sx={{ color: message.includes("Success") ? "green" : "red" }}>
            {message}
          </Typography>
        </Paper>
      </Box>
    </AnimatedPage>
  );
}
