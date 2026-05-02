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

type DateRange = "This Month" | "Last Month" | "This Year";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isLoggedIn, setIsLoggedIn, profileImageUrl } = useAuth();

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [transactions, setTransactions] = useState<any[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // Top-level date range, mirrors the Transactions page selector.
  const [dateRange, setDateRange] = useState<DateRange>("This Month");
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

  /**
   * Predicate: does this transaction fall within the selected date range?
   * Uses the same UTC-month logic as the Transactions page so the two views
   * always agree on what "this month" means.
   */
  const inRange = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (dateRange === "This Month") {
      return (t: any) => {
        const d = new Date(t.date);
        return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
      };
    }
    if (dateRange === "Last Month") {
      const lastMonthDate = new Date(currentYear, currentMonth - 1);
      const lastMonthIdx = lastMonthDate.getMonth();
      const lastMonthYear = lastMonthDate.getFullYear();
      return (t: any) => {
        const d = new Date(t.date);
        return d.getUTCMonth() === lastMonthIdx && d.getUTCFullYear() === lastMonthYear;
      };
    }
    // "This Year"
    return (t: any) => new Date(t.date).getUTCFullYear() === currentYear;
  }, [dateRange]);

  const filteredTransactions = useMemo(() => transactions.filter(inRange), [transactions, inRange]);

  const currency = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  // KPIs and pie chart now reflect the selected range, not the whole dataset.
  const totalIncome = useMemo(
    () => filteredTransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );
  const totalExpenses = useMemo(
    () => filteredTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [filteredTransactions]
  );
  const totalCashFlow = totalIncome + totalExpenses;
  const cashFlow = [
    { name: "Income", value: totalIncome },
    { name: "Expenses", value: totalExpenses },
  ];

  /**
   * Bar chart data. For "This Year" we keep the original 12-month layout.
   * For monthly ranges, we collapse to a single bar so the chart still
   * tells a useful story instead of showing 11 empty months.
   */
  const chartData = useMemo(() => {
    if (dateRange === "This Year") {
      const monthly: Record<string, { name: string; income: number; expense: number }> = {};
      MONTHS.forEach((m) => { monthly[m] = { name: m, income: 0, expense: 0 }; });
      filteredTransactions.forEach((t) => {
        const month = MONTHS[new Date(t.date).getUTCMonth()];
        if (t.amount > 0) monthly[month].income += t.amount;
        else monthly[month].expense += Math.abs(t.amount);
      });
      return Object.values(monthly);
    }
    const label = dateRange === "This Month" ? MONTHS[new Date().getMonth()]
      : MONTHS[new Date(new Date().getFullYear(), new Date().getMonth() - 1).getMonth()];
    const single = { name: label, income: 0, expense: 0 };
    filteredTransactions.forEach((t) => {
      if (t.amount > 0) single.income += t.amount;
      else single.expense += Math.abs(t.amount);
    });
    return [single];
  }, [filteredTransactions, dateRange]);

  /**
   * Compute KPIs as "selected period vs the period before it" so the
   * percentage delta stays meaningful when the user toggles the range.
   *   - This Month  → vs last month
   *   - Last Month  → vs the month before that
   *   - This Year   → vs last year
   */
  const { currentTotals, previousTotals } = useMemo(() => {
    const now = new Date();
    let curStart: Date, curEnd: Date, prevStart: Date, prevEnd: Date;

    if (dateRange === "This Month") {
      curStart = new Date(now.getFullYear(), now.getMonth(), 1);
      curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (dateRange === "Last Month") {
      curStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      curEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
    } else {
      curStart = new Date(now.getFullYear(), 0, 1);
      curEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    }

    const sumIn = (start: Date, end: Date, positive: boolean) =>
      transactions
        .filter((t) => {
          const d = new Date(t.date);
          return d >= start && d <= end && (positive ? t.amount > 0 : t.amount < 0);
        })
        .reduce((s, t) => s + Math.abs(t.amount), 0);

    return {
      currentTotals: { income: sumIn(curStart, curEnd, true), expense: sumIn(curStart, curEnd, false) },
      previousTotals: { income: sumIn(prevStart, prevEnd, true), expense: sumIn(prevStart, prevEnd, false) },
    };
  }, [transactions, dateRange]);

  function calcDelta(current: number, previous: number): number {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / Math.abs(previous)) * 100;
  }

  const kpi = [
    { label: "Total Income", value: currentTotals.income, delta: calcDelta(currentTotals.income, previousTotals.income), type: "income" },
    { label: "Total Expenses", value: currentTotals.expense, delta: calcDelta(currentTotals.expense, previousTotals.expense), type: "expenses" },
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

        {/* Top-level date range selector — mirrors the Transactions page. */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <Select
              size="small"
              fullWidth
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
            >
              <MenuItem value="This Month">This Month</MenuItem>
              <MenuItem value="Last Month">Last Month</MenuItem>
              <MenuItem value="This Year">This Year</MenuItem>
            </Select>
          </Grid>
        </Grid>

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
                  <Typography variant="body2" color="text.secondary">{dateRange}</Typography>
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
