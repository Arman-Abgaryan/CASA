import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Stack,
  Switch,
  Select,
  MenuItem,
  Button,
  FormControlLabel,
  Slider,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import api from "../axiosConfig";

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [hideBalances, setHideBalances] = useState(false);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get("/api/transactions");
      const transactions = res.data;

      const headers = ["Date", "Description", "Amount", "Category"];
      const rows = transactions.map((t: any) => [
        t.date,
        t.description,
        t.amount,
        t.category,
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "casa_transactions.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExporting(false);
    }
  };

  const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <Paper variant="outlined" sx={{ borderRadius: "16px", p: 3, mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
        <Box sx={{ color: "#052e30", display: "flex" }}>{icon}</Box>
        <Typography fontWeight={700} fontSize={15}>{title}</Typography>
      </Stack>
      <Divider sx={{ mb: 2.5 }} />
      {children}
    </Paper>
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={1}>Settings</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Manage your preferences</Typography>

      {/* Appearance */}
      <Section icon={<PaletteOutlinedIcon />} title="Appearance">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" fontWeight={500}>Dark Mode</Typography>
            <Typography variant="caption" color="text.secondary">Switch between light and dark theme</Typography>
          </Box>
          <Switch
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: "#052e30" },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#052e30" },
            }}
          />
        </Stack>
      </Section>

      {/* Currency */}
      <Section icon={<AttachMoneyIcon />} title="Currency">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" fontWeight={500}>Display Currency</Typography>
            <Typography variant="caption" color="text.secondary">Choose your preferred currency</Typography>
          </Box>
          <Select
            size="small"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="USD">🇺🇸 USD</MenuItem>
            <MenuItem value="EUR">🇪🇺 EUR</MenuItem>
            <MenuItem value="GBP">🇬🇧 GBP</MenuItem>
            <MenuItem value="CAD">🇨🇦 CAD</MenuItem>
            <MenuItem value="AUD">🇦🇺 AUD</MenuItem>
            <MenuItem value="JPY">🇯🇵 JPY</MenuItem>
            <MenuItem value="AMD">🇦🇲 AMD</MenuItem>
          </Select>
        </Stack>
      </Section>

      {/* Privacy */}
      <Section icon={<VisibilityOffOutlinedIcon />} title="Privacy">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" fontWeight={500}>Hide Balances</Typography>
            <Typography variant="caption" color="text.secondary">Mask all amounts on the dashboard</Typography>
          </Box>
          <Switch
            checked={hideBalances}
            onChange={(e) => setHideBalances(e.target.checked)}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: "#052e30" },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#052e30" },
            }}
          />
        </Stack>
      </Section>

      {/* Notifications */}
      <Section icon={<NotificationsNoneIcon />} title="Notifications">
        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="body2" fontWeight={500}>Budget Alerts</Typography>
              <Typography variant="caption" color="text.secondary">Get notified when approaching your budget limit</Typography>
            </Box>
            <Switch
              checked={budgetAlerts}
              onChange={(e) => setBudgetAlerts(e.target.checked)}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: "#052e30" },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#052e30" },
              }}
            />
          </Stack>

          {budgetAlerts && (
            <Box>
              <Typography variant="body2" fontWeight={500} mb={1}>
                Alert Threshold: <span style={{ color: "#052e30", fontWeight: 700 }}>{alertThreshold}%</span>
              </Typography>
              <Slider
                value={alertThreshold}
                onChange={(_, v) => setAlertThreshold(v as number)}
                min={50}
                max={100}
                step={5}
                marks
                sx={{ color: "#052e30" }}
              />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">50%</Typography>
                <Typography variant="caption" color="text.secondary">100%</Typography>
              </Stack>
            </Box>
          )}
        </Stack>
      </Section>

      {/* Data Export */}
      <Section icon={<FileDownloadOutlinedIcon />} title="Data Export">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" fontWeight={500}>Export Transactions</Typography>
            <Typography variant="caption" color="text.secondary">Download all your transactions as a CSV file</Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={exporting}
            sx={{
              textTransform: "none",
              borderColor: "#052e30",
              color: "#052e30",
              borderRadius: "8px",
              "&:hover": { backgroundColor: "rgba(5,46,48,0.04)", borderColor: "#052e30" },
            }}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </Stack>
      </Section>
    </Box>
  );
}