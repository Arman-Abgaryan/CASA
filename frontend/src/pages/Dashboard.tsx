import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Menu,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
  Select,
  Stack,
  IconButton,
  Avatar,
  TableContainer,
} from "@mui/material";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import api from "../axiosConfig";
import { useAuth } from "../AuthContext";
import AnimatedPage from "../components/AnimatedPage";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isLoggedIn, setIsLoggedIn, profileImageUrl } = useAuth();

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const COLORS = ["#6ec1e4", "#f5b971"];

  async function fetchUserData() {
    try {
      const res = await api.get("/api/transactions");
      setTransactions(res.data);
    } catch (err: any) {
      console.error("Failed to fetch user data", err);
    }
  }

  useEffect(() => {
    if (!isLoggedIn) setTransactions([]);
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) fetchUserData();
  }, [isLoggedIn]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => MONTHS[new Date(t.date).getUTCMonth()] === selectedMonth);
  }, [transactions, selectedMonth]);

  const currency = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const totalIncome = useMemo(() => transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0), [transactions]);
  const totalExpenses = useMemo(() => transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0), [transactions]);
  const totalCashFlow = totalIncome + totalExpenses;
  const cashFlow = [
    { name: "Income", value: totalIncome },
    { name: "Expenses", value: totalExpenses },
  ];

  const chartData = useMemo(() => {
    const monthly: Record<string, { name: string; income: number; expense: number }> = {};
    MONTHS.forEach((m) => {
      monthly[m] = { name: m, income: 0, expense: 0 };
    });
    transactions.forEach((t) => {
      const month = MONTHS[new Date(t.date).getUTCMonth()];
      if (t.amount > 0) monthly[month].income += t.amount;
      else monthly[month].expense += Math.abs(t.amount);
    });
    return Object.values(monthly);
  }, [transactions]);

  const currentMonthIndex = new Date().getMonth();
  const lastMonthIndex = (currentMonthIndex - 1 + 12) % 12;

  const calcMonthlyTotal = (monthIndex: number, positive: boolean) =>
    transactions
      .filter((t) => new Date(t.date).getUTCMonth() === monthIndex && (positive ? t.amount > 0 : t.amount < 0))
      .reduce((s, t) => s + Math.abs(t.amount), 0);

  const lastMonthIncome = calcMonthlyTotal(lastMonthIndex, true);
  const lastMonthExpenses = calcMonthlyTotal(lastMonthIndex, false);
  const currentMonthIncome = calcMonthlyTotal(currentMonthIndex, true);
  const currentMonthExpenses = calcMonthlyTotal(currentMonthIndex, false);

  function calcDelta(current: number, previous: number): number {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / Math.abs(previous)) * 100;
  }

  const kpi = [
    { label: "Total Income", value: currentMonthIncome, delta: calcDelta(currentMonthIncome, lastMonthIncome), type: "income" },
    { label: "Total Expenses", value: currentMonthExpenses, delta: calcDelta(currentMonthExpenses, lastMonthExpenses), type: "expenses" },
  ];

  const handleLogout = () => {
    setAnchorEl(null);
    localStorage.clear();
    setTransactions([]);
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <AnimatedPage>
      <Stack spacing={{ xs: 2, md: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: 30, md: 34 } }}>Dashboard</Typography>
            <Typography variant="subtitle1" color="text.secondary">Welcome back! Here's your financial summary</Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            alignSelf={{ xs: "flex-start", sm: "auto" }}
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            <IconButton><SearchIcon /></IconButton>
            <IconButton><NotificationsNoneIcon /></IconButton>
            <Divider orientation="vertical" flexItem sx={{ height: 35 }} />
            <IconButton onClick={(e) => (!isLoggedIn ? navigate("/login") : setAnchorEl(e.currentTarget))} sx={{ p: 0.5 }}>
              <Avatar src={profileImageUrl ?? undefined} sx={{ width: 32, height: 32, bgcolor: "#bdbdbd" }} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
              {!isLoggedIn && <MenuItem onClick={() => { setAnchorEl(null); navigate("/login"); }}>Login</MenuItem>}
              {isLoggedIn && <MenuItem onClick={() => { setAnchorEl(null); navigate("/profile"); }}>Profile</MenuItem>}
              {isLoggedIn && <MenuItem onClick={handleLogout}>Logout</MenuItem>}
            </Menu>
          </Stack>
        </Box>

        <Grid container spacing={2}>
          {kpi.map((k) => {
            const isIncrease = k.delta > 0;
            const chipColor = k.type === "expenses" ? (isIncrease ? "error" : "success") : (isIncrease ? "success" : "error");
            const ArrowIcon = isIncrease ? ArrowDropUpIcon : ArrowDropDownIcon;
            return (
              <Grid item xs={12} sm={6} key={k.label}>
                <Card variant="outlined" sx={{ borderRadius: 3, transition: "transform 180ms ease, box-shadow 180ms ease", "&:hover": { transform: "translateY(-3px)", boxShadow: 3 } }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                      <Chip size="small" color={chipColor as any} icon={<ArrowIcon />} label={`${Math.abs(k.delta).toFixed(0)}%`} />
                    </Stack>
                    <Typography variant="subtitle2" color="text.secondary">{k.label}</Typography>
                    <Typography variant="h5" fontWeight={800}>{currency(k.value)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={3}>Summary</Typography>
                <Box sx={{ width: "100%", height: { xs: 260, sm: 300 } }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis tickCount={5} width={42} />
                      <Tooltip formatter={(v: number) => currency(v)} />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#6ec1e4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Expenses" fill="#f5b971" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700}>Cash Flow</Typography>
                <Box sx={{ width: "100%", height: { xs: 220, sm: 240 } }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={cashFlow} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                        {cashFlow.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => currency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Stack direction="row" justifyContent="center" spacing={3} mt={1} mb={1} flexWrap="wrap">
                  <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS[0] }} /><Typography variant="body2">Income</Typography></Stack>
                  <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS[1] }} /><Typography variant="body2">Expenses</Typography></Stack>
                </Stack>
                <Stack direction="row" justifyContent="center" spacing={1}><Typography variant="caption">Total</Typography><Typography fontWeight={800}>{currency(totalCashFlow)}</Typography></Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} mb={1}>
                  <Typography variant="h6">Recent Transactions</Typography>
                  <Select size="small" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} sx={{ minWidth: { xs: "100%", sm: 110 } }}>
                    {MONTHS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </Select>
                </Stack>

                <Divider sx={{ mb: 1 }} />
                <TableContainer sx={{ overflowX: "auto" }}>
                  <Table size="small" sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Item Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTransactions.slice(0, 5).map((t, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>{t.date}</TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell>{t.amount >= 0 ? "Income" : "Expense"}</TableCell>
                          <TableCell>{t.category}</TableCell>
                          <TableCell align="right" sx={{ color: t.amount < 0 ? "error.main" : "success.main", fontWeight: 700 }}>
                            {currency(Math.abs(t.amount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </AnimatedPage>
  );
}
