import { Box, Button, Chip, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import FlagIcon from "@mui/icons-material/Flag";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SavingsIcon from "@mui/icons-material/Savings";
import SecurityIcon from "@mui/icons-material/Security";

const teal = "#052e30";
const lightTeal = "#0f5a5f";
const blue = "#66c2e5";
const orange = "#f7bd6b";

function DashboardPreview() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 4,
        overflow: "hidden",
        border: "1px solid #dfe6e6",
        boxShadow: "0 24px 80px rgba(5, 46, 48, 0.22)",
        backgroundColor: "white",
      }}
    >
      <Box sx={{ display: "flex", minHeight: 420 }}>
        <Box sx={{ width: 135, bgcolor: teal, color: "white", p: 2.5, display: { xs: "none", sm: "block" } }}>
          <Typography fontWeight={800} fontSize={19} mb={3}>CASA</Typography>
          {["Dashboard", "Budgets", "Goals", "Transactions"].map((item) => (
            <Typography key={item} fontSize={10} sx={{ opacity: 0.9, mb: 2 }}>
              {item}
            </Typography>
          ))}
        </Box>

        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>Dashboard</Typography>
          <Typography fontSize={12} color="text.secondary" mb={2}>Welcome back! Here's your financial summary</Typography>

          <Grid container spacing={1.5} mb={2.5}>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Chip size="small" label="▼ 0%" sx={{ bgcolor: "#e5373c", color: "white", height: 20, fontWeight: 700 }} />
                <Typography fontSize={11} color="text.secondary" mt={1}>Total Income</Typography>
                <Typography fontWeight={800} fontSize={22}>$504</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Chip size="small" label="▼ 0%" sx={{ bgcolor: "#217a34", color: "white", height: 20, fontWeight: 700 }} />
                <Typography fontSize={11} color="text.secondary" mt={1}>Total Expenses</Typography>
                <Typography fontWeight={800} fontSize={22}>$142</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid item xs={12} md={8}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: 210 }}>
                <Typography fontWeight={800} fontSize={14} mb={2}>Summary</Typography>
                <Box sx={{ height: 145, borderBottom: "1px solid #9aa4a5", borderLeft: "1px solid #9aa4a5", display: "flex", alignItems: "flex-end", gap: 1.3, px: 2 }}>
                  {months.map((month, index) => (
                    <Box key={month} sx={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 0.6 }}>
                      <Box sx={{ width: 14, height: index > 0 && index < 4 ? 106 : 0, bgcolor: blue, borderRadius: "4px 4px 0 0" }} />
                      <Box sx={{ width: 14, height: index > 0 && index < 4 ? 34 : 0, bgcolor: orange, borderRadius: "4px 4px 0 0" }} />
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: 210, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography fontWeight={800} fontSize={14} alignSelf="flex-start">Cash Flow</Typography>
                <Box sx={{ mt: 2, width: 118, height: 118, borderRadius: "50%", background: `conic-gradient(${blue} 0 76%, ${orange} 76% 100%)`, display: "grid", placeItems: "center" }}>
                  <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: "white" }} />
                </Box>
                <Typography fontSize={12} mt={1}>Total <b>$1,940</b></Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Paper>
  );
}

const featureCards = [
  {
    icon: <AccountBalanceIcon />,
    title: "All banks in one place",
    text: "Connect different bank accounts through Plaid and view your imported expenses from one centralized dashboard.",
  },
  {
    icon: <ReceiptLongIcon />,
    title: "Clear transaction tracking",
    text: "See recent purchases, income, categories, and spending patterns without jumping between bank apps.",
  },
  {
    icon: <DonutLargeIcon />,
    title: "Budgets by transaction type",
    text: "Set budgets for categories like food, transport, subscriptions, travel, and other transaction types.",
  },
  {
    icon: <FlagIcon />,
    title: "Savings goals",
    text: "Create goals, track your progress, and keep your savings plan visible next to your day-to-day spending.",
  },
];

export default function Landing() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7fbfb", color: "#1f2528" }}>
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: "rgba(247, 251, 251, 0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(5, 46, 48, 0.08)",
        }}
      >
        <Container maxWidth="lg" sx={{ py: 2.2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography fontWeight={900} fontSize={26} letterSpacing={0.5} sx={{ color: teal }}>
            CASA
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button component={RouterLink} to="/login" variant="outlined" sx={{ borderColor: teal, color: teal, borderRadius: 999, px: 3 }}>
              Login
            </Button>
            <Button component={RouterLink} to="/signup" variant="contained" sx={{ bgcolor: teal, borderRadius: 999, px: 3, "&:hover": { bgcolor: lightTeal } }}>
              Sign Up
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pt: { xs: 7, md: 10 }, pb: 7 }}>
        <Grid container spacing={5} alignItems="center">
          <Grid item xs={12} md={5}>
            <Chip icon={<SavingsIcon />} label="Personal finance, simplified" sx={{ bgcolor: "#e7f5f5", color: teal, fontWeight: 800, mb: 2 }} />
            <Typography variant="h2" fontWeight={900} lineHeight={1.05} sx={{ fontSize: { xs: 42, md: 58 } }}>
              Take control of your money from one dashboard.
            </Typography>
            <Typography color="text.secondary" fontSize={18} lineHeight={1.7} mt={2.5}>
              CASA brings your expenses, budgets, connected banks, and savings goals into one clean financial home.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mt={4}>
              <Button component={RouterLink} to="/signup" size="large" variant="contained" sx={{ bgcolor: teal, borderRadius: 999, px: 4, py: 1.25, "&:hover": { bgcolor: lightTeal } }}>
                Create your account
              </Button>
              <Button component={RouterLink} to="/login" size="large" variant="outlined" sx={{ borderColor: teal, color: teal, borderRadius: 999, px: 4, py: 1.25 }}>
                Log in
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={7}>
            <DashboardPreview />
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ bgcolor: "white", py: { xs: 7, md: 9 }, borderTop: "1px solid #e3eaea", borderBottom: "1px solid #e3eaea" }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            {featureCards.map((feature) => (
              <Grid item xs={12} sm={6} md={3} key={feature.title}>
                <Paper elevation={0} sx={{ height: "100%", p: 3, borderRadius: 4, border: "1px solid #e1e8e8" }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: "#e7f5f5", color: teal, display: "grid", placeItems: "center", mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography fontWeight={850} fontSize={19} mb={1}>{feature.title}</Typography>
                  <Typography color="text.secondary" lineHeight={1.65}>{feature.text}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Grid container spacing={5} alignItems="center">
          <Grid item xs={12} md={5}>
            <Chip icon={<SecurityIcon />} label="Powered by Plaid connections" sx={{ bgcolor: "#e7f5f5", color: teal, fontWeight: 800, mb: 2 }} />
            <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: 32, md: 44 } }}>
              Import expenses from the accounts you already use.
            </Typography>
            <Typography color="text.secondary" fontSize={17} lineHeight={1.75} mt={2}>
              Link banks through Plaid, refresh transactions, and manage connected institutions directly inside CASA. Your dashboard then turns those transactions into useful views for income, expenses, budgets, and goals.
            </Typography>
          </Grid>
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2.5 }, borderRadius: 4, border: "1px solid #dfe6e6", boxShadow: "0 22px 70px rgba(5, 46, 48, 0.18)", bgcolor: "white" }}>
              <Box
                component="img"
                src="/images/plaid-import-screen.png"
                alt="Plaid institution selection screen used to connect bank accounts"
                sx={{ width: "100%", maxHeight: 560, objectFit: "contain", display: "block", borderRadius: 3, bgcolor: "white" }}
              />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
