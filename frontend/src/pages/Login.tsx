import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Box,
  Paper,
  Button,
  Stack,
  TextField,
  IconButton,
  CircularProgress,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import InputAdornment from "@mui/material/InputAdornment";
import { API_BASE } from "../axiosConfig";
import { useAuth } from "../AuthContext";
import AnimatedPage from "../components/AnimatedPage";

/**
 * If the backend is sleeping (Render free tier sleeps after 15 min idle),
 * the first request can take 30–60 seconds. After this many milliseconds
 * we show a "the server is waking up" message so the user understands the
 * delay and doesn't assume the app is broken.
 */
const COLD_START_HINT_MS = 4000;

/**
 * Hard cap on how long we'll wait for the login request before giving up
 * and asking the user to retry. Set high enough that a Render cold start
 * still has plenty of time to finish.
 */
const LOGIN_TIMEOUT_MS = 90_000;

export default function Login() {
  const navigate = useNavigate();
  const { setIsLoggedIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coldStartHint, setColdStartHint] = useState(false);

  // Track timers so we can cancel them if the request finishes/fails first.
  const hintTimer = useRef<number | null>(null);

  useEffect(() => {
    // Visiting the login page clears any partial auth state from a prior
    // session. Note that we deliberately do NOT call setIsLoggedIn(false)
    // here — that would happen via AuthProvider if the server says so.
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("firstName");
    localStorage.removeItem("lastName");
    localStorage.removeItem("email");

    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // Guard against accidental double-submits.

    setLoading(true);
    setMessage("");
    setColdStartHint(false);

    // After a few seconds with no response, surface the "waking up" hint.
    hintTimer.current = window.setTimeout(() => setColdStartHint(true), COLD_START_HINT_MS);

    // AbortController gives us a hard timeout the user can rely on. Without
    // this, fetch can hang forever and the spinner spins indefinitely.
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("firstName", data.firstName);
        localStorage.setItem("lastName", data.lastName);
        localStorage.setItem("email", data.email);
        if (data.profileImageUrl) {
          localStorage.setItem("profileImageUrl", data.profileImageUrl);
        }

        // Update auth context immediately, then SPA-navigate. Avoids a full
        // page reload that would race with AuthProvider's /api/auth/me call.
        setIsLoggedIn(true);
        navigate("/dashboard", { replace: true });
        return;
      }

      // Non-2xx — read the body as text and show it.
      const errBody = await res.text();
      setMessage(errBody || "Invalid email or password.");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setMessage("Login timed out. The server may be starting up — please try again.");
      } else {
        setMessage("Error connecting to server. Please try again in a moment.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
      setLoading(false);
      setColdStartHint(false);
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
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
            <TextField
              label="Password"
              variant="outlined"
              type={showPassword ? "text" : "password"}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((prev) => !prev)} disabled={loading}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{ borderRadius: 5, py: 1.2 }}
            >
              {loading ? "Signing in..." : "Login"}
            </Button>

            {coldStartHint && (
              <Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary", fontStyle: "italic" }}>
                The server is waking up — this can take up to a minute on the first sign-in.
              </Typography>
            )}

            <Typography
              variant="body2"
              sx={{ textAlign: "center", cursor: loading ? "default" : "pointer", color: "#1976d2", opacity: loading ? 0.5 : 1 }}
              onClick={() => !loading && navigate("/forgot-password")}
            >
              Forgot password?
            </Typography>

            <Typography
              variant="body2"
              sx={{ mt: 2, textAlign: "center", cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1 }}
              onClick={() => !loading && navigate("/signup")}
            >
              Don't have an account? <span style={{ color: "#1976d2" }}>Sign up</span>
            </Typography>
          </Stack>

          {message && (
            <Typography mt={2} textAlign="center" sx={{ color: message.toLowerCase().includes("success") ? "green" : "red" }}>
              {message}
            </Typography>
          )}
        </Paper>
      </Box>
    </AnimatedPage>
  );
}
