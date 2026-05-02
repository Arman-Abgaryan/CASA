import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

import api from "../axiosConfig";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import AnimatedPage from "../components/AnimatedPage";
import { API_BASE } from "../axiosConfig";

type PanelKey = "account" | "email" | "password" | "notifications" | "data";

interface Preferences {
  notifyBudget50: boolean;
  notifyBudget80: boolean;
  notifyBudget100: boolean;
  notifyLogin: boolean;
  weeklySummary: boolean;
}

const DEFAULT_PREFS: Preferences = {
  notifyBudget50: false,
  notifyBudget80: true,
  notifyBudget100: true,
  notifyLogin: false,
  weeklySummary: false,
};

const NAV_ITEMS: { key: PanelKey; label: string; icon: React.ReactNode }[] = [
  { key: "account", label: "Account", icon: <PersonOutlineIcon fontSize="small" /> },
  { key: "email", label: "Change Email", icon: <EmailOutlinedIcon fontSize="small" /> },
  { key: "password", label: "Change Password", icon: <LockOutlinedIcon fontSize="small" /> },
  { key: "notifications", label: "Notifications", icon: <NotificationsNoneOutlinedIcon fontSize="small" /> },
  { key: "data", label: "Data & Privacy", icon: <CloudDownloadOutlinedIcon fontSize="small" /> },
];

export default function Settings() {
  const { setIsLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [panel, setPanel] = useState<PanelKey>("account");
  const [toast, setToast] = useState<{ severity: "success" | "error" | "info"; text: string } | null>(null);

  // ---- Account state ----
  const [firstName, setFirstName] = useState(localStorage.getItem("firstName") || "");
  const [lastName, setLastName] = useState(localStorage.getItem("lastName") || "");
  const email = localStorage.getItem("email") || "";
  const [savingName, setSavingName] = useState(false);

  // ---- Change-email state ----
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // ---- Change-password state ----
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // ---- Preferences state ----
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Load preferences once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/api/users/preferences");
        if (!cancelled) {
          setPrefs(res.data);
          setPrefsLoaded(true);
        }
      } catch (err) {
        console.error("Failed to load preferences", err);
        if (!cancelled) setPrefsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------------- Handlers ----------------

  const saveName = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setToast({ severity: "error", text: "Both first and last name are required." });
      return;
    }
    setSavingName(true);
    try {
      const res = await api.patch("/api/users/me", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      localStorage.setItem("firstName", res.data.firstName);
      localStorage.setItem("lastName", res.data.lastName);
      setToast({ severity: "success", text: "Name updated." });
    } catch (err: any) {
      setToast({ severity: "error", text: err?.response?.data?.error || "Failed to update name." });
    } finally {
      setSavingName(false);
    }
  };

  const saveEmail = async () => {
    if (!newEmail.trim() || !emailPassword) {
      setToast({ severity: "error", text: "Please fill out both fields." });
      return;
    }
    setSavingEmail(true);
    try {
      await api.post("/api/users/change-email", {
        newEmail: newEmail.trim(),
        currentPassword: emailPassword,
      });
      // The backend cleared our session; force a fresh login with the new email.
      localStorage.clear();
      setIsLoggedIn(false);
      setToast({ severity: "success", text: "Email updated. Please sign in again." });
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: any) {
      setToast({ severity: "error", text: err?.response?.data?.error || "Failed to change email." });
    } finally {
      setSavingEmail(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setToast({ severity: "error", text: "Please fill out all fields." });
      return;
    }
    if (newPassword.length < 8) {
      setToast({ severity: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ severity: "error", text: "New passwords don't match." });
      return;
    }
    setSavingPassword(true);
    try {
      await api.post("/api/users/change-password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setToast({ severity: "success", text: "Password updated." });
    } catch (err: any) {
      setToast({ severity: "error", text: err?.response?.data?.error || "Failed to change password." });
    } finally {
      setSavingPassword(false);
    }
  };

  const savePrefs = async (next: Preferences) => {
    setSavingPrefs(true);
    setPrefs(next); // optimistic update — toggles feel instant
    try {
      await api.put("/api/users/preferences", next);
      setToast({ severity: "success", text: "Preferences saved." });
    } catch (err: any) {
      setToast({ severity: "error", text: "Failed to save preferences." });
    } finally {
      setSavingPrefs(false);
    }
  };

  // Each toggle reads the current prefs, flips the relevant flag, and saves
  // the merged object. Wrapped to avoid duplicating boilerplate per row.
  const togglePref = (key: keyof Preferences) => () => {
    savePrefs({ ...prefs, [key]: !prefs[key] });
  };

  const downloadCsv = () => {
    // The backend returns a streamed CSV; the simplest way to trigger a
    // browser download with credentials is a normal anchor click. We can't
    // use api.get here because we'd have to construct an in-memory blob —
    // a direct link is simpler and lets the browser save with the
    // Content-Disposition filename the backend supplies.
    const a = document.createElement("a");
    a.href = `${API_BASE}/api/users/export`;
    // Force a navigation that includes cookies; opening in a new tab also works.
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ---------------- Render helpers ----------------

  const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <Box mb={2}>
      <Typography variant="h6" fontWeight={700}>{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>}
    </Box>
  );

  return (
    <AnimatedPage>
      <Box>
        <Typography variant="h4" fontWeight={800} mb={3}>Settings</Typography>

        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3, alignItems: "stretch" }}>
          {/* ── LEFT NAV ── */}
          <Paper variant="outlined" sx={{ width: { xs: "100%", md: 240 }, flexShrink: 0, p: 2, borderRadius: "16px" }}>
            <Stack spacing={0.5}>
              {NAV_ITEMS.map((item) => {
                const active = panel === item.key;
                return (
                  <Button
                    key={item.key}
                    fullWidth
                    onClick={() => setPanel(item.key)}
                    sx={{
                      textTransform: "none",
                      justifyContent: "flex-start",
                      px: 1.5,
                      py: 1.2,
                      borderRadius: "10px",
                      color: active ? "#1976d2" : "text.secondary",
                      background: active ? "rgba(25,118,210,0.06)" : "transparent",
                      border: `1px solid ${active ? "rgba(25,118,210,0.2)" : "transparent"}`,
                      "&:hover": { background: active ? "rgba(25,118,210,0.08)" : "rgba(0,0,0,0.04)" },
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

          {/* ── RIGHT CONTENT ── */}
          <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: { xs: 2.25, md: 3.5 }, borderRadius: "16px" }}>

            {/* Account: name */}
            {panel === "account" && (
              <Box>
                <SectionTitle title="Account" subtitle="Update the name shown on your account." />
                <Stack spacing={2} maxWidth={520}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <TextField
                      label="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={savingName}
                    />
                    <TextField
                      label="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={savingName}
                    />
                  </Box>
                  <TextField label="Email" value={email} disabled helperText="To change your email, use the Change Email tab." />
                  <Box>
                    <Button variant="contained" onClick={saveName} disabled={savingName} startIcon={savingName ? <CircularProgress size={16} color="inherit" /> : null}>
                      {savingName ? "Saving..." : "Save changes"}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            )}

            {/* Email change */}
            {panel === "email" && (
              <Box>
                <SectionTitle title="Change Email" subtitle="We'll send a confirmation to your old address. You'll need to sign in again afterwards." />
                <Stack spacing={2} maxWidth={520}>
                  <TextField label="Current Email" value={email} disabled />
                  <TextField
                    label="New Email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={savingEmail}
                  />
                  <TextField
                    label="Current Password"
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    disabled={savingEmail}
                    autoComplete="current-password"
                  />
                  <Box>
                    <Button variant="contained" onClick={saveEmail} disabled={savingEmail} startIcon={savingEmail ? <CircularProgress size={16} color="inherit" /> : null}>
                      {savingEmail ? "Updating..." : "Update email"}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            )}

            {/* Password change */}
            {panel === "password" && (
              <Box>
                <SectionTitle title="Change Password" subtitle="At least 8 characters. We recommend a passphrase you don't use anywhere else." />
                <Stack spacing={2} maxWidth={520}>
                  <TextField
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={savingPassword}
                    autoComplete="current-password"
                  />
                  <TextField
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={savingPassword}
                    autoComplete="new-password"
                  />
                  <TextField
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={savingPassword}
                    autoComplete="new-password"
                  />
                  <Box>
                    <Button variant="contained" onClick={savePassword} disabled={savingPassword} startIcon={savingPassword ? <CircularProgress size={16} color="inherit" /> : null}>
                      {savingPassword ? "Updating..." : "Update password"}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            )}

            {/* Notifications */}
            {panel === "notifications" && (
              <Box>
                <SectionTitle title="Notifications" subtitle="Choose when CASA should email you." />

                {!prefsLoaded ? (
                  <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /><Typography variant="body2">Loading preferences…</Typography></Stack>
                ) : (
                  <Stack spacing={3} maxWidth={620}>
                    {/* Budget alert thresholds */}
                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                      <CardContent>
                        <Typography fontWeight={700} mb={1}>Budget alerts</Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                          Get an email when this month's spending crosses one of these thresholds. You'll get at most one email per threshold per month.
                        </Typography>
                        <Stack spacing={1}>
                          <FormControlLabel
                            control={<Switch checked={prefs.notifyBudget50} onChange={togglePref("notifyBudget50")} disabled={savingPrefs} />}
                            label={<Typography>50% of budget used <Typography component="span" color="success.main" fontWeight={600}>(green)</Typography></Typography>}
                          />
                          <FormControlLabel
                            control={<Switch checked={prefs.notifyBudget80} onChange={togglePref("notifyBudget80")} disabled={savingPrefs} />}
                            label={<Typography>80% of budget used <Typography component="span" sx={{ color: "#EBC106" }} fontWeight={600}>(yellow)</Typography></Typography>}
                          />
                          <FormControlLabel
                            control={<Switch checked={prefs.notifyBudget100} onChange={togglePref("notifyBudget100")} disabled={savingPrefs} />}
                            label={<Typography>Budget exceeded <Typography component="span" color="error.main" fontWeight={600}>(red)</Typography></Typography>}
                          />
                        </Stack>
                      </CardContent>
                    </Card>

                    {/* Account security */}
                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                      <CardContent>
                        <Typography fontWeight={700} mb={1}>Account security</Typography>
                        <FormControlLabel
                          control={<Switch checked={prefs.notifyLogin} onChange={togglePref("notifyLogin")} disabled={savingPrefs} />}
                          label="Email me every time someone signs into my account"
                        />
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          The email will include the IP address and device. Useful if you want to spot unauthorized access.
                        </Typography>
                      </CardContent>
                    </Card>

                    {/* Periodic emails */}
                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                      <CardContent>
                        <Typography fontWeight={700} mb={1}>Periodic emails</Typography>
                        <FormControlLabel
                          control={<Switch checked={prefs.weeklySummary} onChange={togglePref("weeklySummary")} disabled={savingPrefs} />}
                          label="Send me a weekly spending summary"
                        />
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          A short Monday-morning recap of last week's income, expenses, and budget progress.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Stack>
                )}
              </Box>
            )}

            {/* Data & privacy */}
            {panel === "data" && (
              <Box>
                <SectionTitle title="Data & Privacy" subtitle="Your data is yours. Take a copy any time." />
                <Stack spacing={2} maxWidth={620}>
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                      <Typography fontWeight={700} mb={1}>Export your transactions</Typography>
                      <Typography variant="body2" color="text.secondary" mb={2}>
                        Download every transaction on your account as a CSV file you can open in Excel, Google Sheets, or another tool.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<CloudDownloadOutlinedIcon />}
                        onClick={downloadCsv}
                      >
                        Download CSV
                      </Button>
                    </CardContent>
                  </Card>

                  <Divider />

                  <Typography variant="body2" color="text.secondary">
                    Need to manage connected banks? Head to the Transactions page and click <strong>Manage Banks</strong>.
                  </Typography>
                </Stack>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : <span />}
      </Snackbar>
    </AnimatedPage>
  );
}
