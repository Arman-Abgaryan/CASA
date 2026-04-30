import { useState } from "react";
import { useEffect } from "react";
import { Typography, Box, Paper, Button, Stack, TextField, IconButton } from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import InputAdornment from "@mui/material/InputAdornment";

import { API_BASE } from "../axiosConfig";

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

  async function handleLogin(e) {
    e.preventDefault();

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      // SUCCESSFUL LOGIN
      if (res.ok) {
        const data = await res.json(); // JSON { firstName, lastName, email }

        // Store the new user info
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("firstName", data.firstName);
        localStorage.setItem("lastName", data.lastName);
        localStorage.setItem("email", data.email);

        window.location.href = "/dashboard";
        return;
      }

      // -------------------------------
      // FAILED LOGIN
      // -------------------------------
      const text = await res.text();
      setMessage(text);

    } catch (err) {
      setMessage("Error connecting to server");
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleLogin}
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 5,
          width: 400,
          borderRadius: 3,
          boxShadow: 5,
        }}
      >
        <Typography
          variant="h6"
          fontWeight="bold"
          mb={2}
          textAlign="center"
          fontSize="28px"
        >
          Login
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="Password"
            variant="outlined"
            type = {showPassword ? "text" : "password"}
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
              InputProps = {{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick = {() => setShowPassword((prev) => !prev)}>
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
            sx={{ borderRadius: 5 }}
          >
            Login
          </Button>

          <Typography
            variant="body2"
            sx={{ mt: 2, textAlign: "center", cursor: "pointer" }}
            onClick={() => (window.location.href = "/signup")}
          >
            Don’t have an account?{" "}
            <span style={{ color: "#1976d2" }}>Sign up</span>
          </Typography>
        </Stack>

        <Typography
          mt={2}
          textAlign="center"
          sx={{
            color: message.includes("Success") ? "green" : "red",
          }}
        >
          {message}
        </Typography>
      </Paper>
    </Box>
  );
}
