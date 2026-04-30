import { useState } from "react";
import { Typography, Box, Paper, Button, Stack, TextField, Link } from "@mui/material";
import { useNavigate } from "react-router-dom";

import { API_BASE } from "../axiosConfig";

export default function Signup() {
  const navigate = useNavigate();

  // NEW STATE VALUES
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [message, setMessage]     = useState("");

  async function handleSignup(e) {
    e.preventDefault();

    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password
        }),
      });

      const text = await res.text();
      setMessage(text);

      if (res.ok) {
        setTimeout(() => navigate("/login"), 1200);
      }
    } catch (err) {
      setMessage("Error connecting to server");
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSignup}
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
          Create Account
        </Typography>

        <Stack spacing={2}>

          {/* FIRST NAME */}
          <TextField
            label="First Name"
            fullWidth
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          {/* LAST NAME */}
          <TextField
            label="Last Name"
            fullWidth
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />

          {/* EMAIL */}
          <TextField
            label="Email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* PASSWORD */}
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* SIGN UP BUTTON */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ borderRadius: 5 }}
          >
            Sign Up
          </Button>

          <Typography variant="body2" textAlign="center" sx={{ mt: 1 }}>
            Already have an account?{" "}
            <Link component="button" onClick={() => navigate("/login")}>
              Login
            </Link>
          </Typography>

          <Typography textAlign="center" sx={{ mt: 2 }}>
            {message}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
