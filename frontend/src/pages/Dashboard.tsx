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
} from "@mui/material";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";

import api from "../axiosConfig";
import { useAuth } from "../AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isLoggedIn, setIsLoggedIn, profileImageUrl } = useAuth();

  const MONTHS = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  const [selectedMonth, setSelectedMonth] = useState(
    MONTHS[new Date().getMonth()]
  );

  /* ---------------- Fetch Transactions ---------------- */
  const [transactions, setTransactions] = useState([]);

  async function fetchUserData() {
    try {
      const res = await api.get("/api/transactions");
      setTransactions(res.data);
    } catch (err: any) {
      console.error("Failed to fetch user data", err);
    }
  }

  /* ---------------- Filter Transactions ---------------- */
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.date);
      const monthShort = MONTHS[date.getUTCMonth()];
      return monthShort === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  useEffect(() => {
    if (!isLoggedIn) {
      setTransactions([]);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserData();
    }
  }, [isLoggedIn]);

  /* ---------------- MENU ---------------- */
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    localStorage.clear();
    setTransactions([]);
    setIsLoggedIn(false);
    navigate("/login");
  };

  /* ---------------- CHART STATE ---------------- */
  const [period, setPeriod] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");

  /* ---------------- CHART DATA ---------------- */
  const COLORS = ["#6ec1e4", "#f5b971"];

  const currency = (n: number) =>
    n.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

  const totalIncome = useMemo(() => {
    return transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [transactions]);

  const balance = useMemo(() => {
    return totalIncome - totalExpenses;
  }, [totalIncome, totalExpenses]);

  const cashFlow = [
    { name: "Income", value: totalIncome },
    { name: "Expenses", value: totalExpenses },
  ];

  const totalCashFlow = totalIncome + totalExpenses;

  const chartData = useMemo(() => {
    const months = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    const monthly = {};
    months.forEach(m => {
      monthly[m] = { name: m, income: 0, expense: 0 };
    });

    transactions.forEach(t => {
      const month = MONTHS[new Date(t.date).getUTCMonth()];
      if (t.amount > 0) {
        monthly[month].income += t.amount;
      } else {
        monthly[month].expense += Math.abs(t.amount);
      }
    });

    return Object.values(monthly);
  }, [transactions]);

  /* ---------- Previous Month Calculations ---------- */
  const currentMonthIndex = new Date().getMonth();
  const lastMonthIndex = (currentMonthIndex - 1 + 12) % 12;

  const lastMonthIncome = useMemo(() => {
    return transactions
      .filter(t => {
        const m = new Date(t.date).getUTCMonth();
        return m === lastMonthIndex && t.amount > 0;
      })
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions, lastMonthIndex]);

  const lastMonthExpenses = useMemo(() => {
    return transactions
      .filter(t => {
        const m = new Date(t.date).getUTCMonth();
        return m === lastMonthIndex && t.amount < 0;
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0);
  }, [transactions, lastMonthIndex]);

  const lastMonthBalance = useMemo(() => {
    return lastMonthIncome - lastMonthExpenses;
  }, [lastMonthIncome, lastMonthExpenses]);

  /* ---------- Current Month Calculations ---------- */
  const currentMonthIncome = useMemo(() => {
    return transactions
      .filter(t => {
        const m = new Date(t.date).getUTCMonth();
        return m === currentMonthIndex && t.amount > 0;
      })
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions, currentMonthIndex]);

  const currentMonthExpenses = useMemo(() => {
    return transactions
      .filter(t => {
        const m = new Date(t.date).getUTCMonth();
        return m === currentMonthIndex && t.amount < 0;
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0);
  }, [transactions, currentMonthIndex]);

  const currentMonthBalance = currentMonthIncome - currentMonthExpenses;

  /* ---------- Delta formula ---------- */
  function calcDelta(current: number, previous: number): number {
    if (previous === 0) {
      if (current === 0) return 0;
      return 100;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  }

  /* ---------- DELTAS ---------- */
  const incomeDelta = calcDelta(currentMonthIncome, lastMonthIncome);
  const expensesDelta = calcDelta(currentMonthExpenses, lastMonthExpenses);
  const balanceDelta = calcDelta(currentMonthBalance, lastMonthBalance);

  const kpi = [
    { label: "Total Income", value: currentMonthIncome, delta: incomeDelta, type: "income" },
    { label: "Total Expenses", value: currentMonthExpenses, delta: expensesDelta, type: "expenses" },
  ];

  function isPositiveChange(delta: number) {
    return delta > 0;
  }

  function isNeutral(delta: number) {
    return delta === 0;
  }

  /* ---------------- DASHBOARD UI ---------------- */
  return (
    <Stack spacing={3}>
      {/* ---------------- TOP BAR ---------------- */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Dashboard</Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Welcome back! Here's your financial summary
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton><SearchIcon /></IconButton>
          <IconButton><NotificationsNoneIcon /></IconButton>
          <Divider orientation="vertical" sx={{ height: 35 }} />

          <IconButton
            onClick={(e) => {
              if (!isLoggedIn) navigate("/login");
              else handleMenuOpen(e);
            }}
            sx = {{ p: 0.5 }}
          >
            <Avatar
              src={profileImageUrl ?? undefined}
              sx={{ width: 32, height: 32, bgcolor: "#bdbdbd" }}
            />
          </IconButton>

          <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
            {!isLoggedIn && (
              <MenuItem onClick={() => { handleMenuClose(); navigate("/login"); }}>
                Login
              </MenuItem>
            )}
            {isLoggedIn && (
              <MenuItem onClick={() => { handleMenuClose(); navigate("/profile"); }}>
                Profile
              </MenuItem>
            )}
            {isLoggedIn && (
              <>
                <Divider />
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </>
            )}
          </Menu>
        </Stack>
      </Box>

      {/* ---------------- KPI CARDS ---------------- */}
      <Grid container spacing={2}>
        {kpi.map((k) => {
          const isIncrease = isPositiveChange(k.delta);
          const neutral = isNeutral(k.delta);

          let chipColor: "success" | "error" | "info" = "success";
          let ArrowIcon = ArrowDropUpIcon;

          if (k.type === "income" || k.type === "balance") {
            chipColor = isIncrease ? "success" : "error";
            ArrowIcon = isIncrease ? ArrowDropUpIcon : ArrowDropDownIcon;
          }

          if (k.type === "expenses") {
            chipColor = isIncrease ? "error" : "success";
            ArrowIcon = isIncrease ? ArrowDropUpIcon : ArrowDropDownIcon;
          }

          return (
            <Grid item xs={12} md={6} lg={3} key={k.label} mt={-2}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Chip
                      size="small"
                      color={chipColor}
                      icon={<ArrowIcon />}
                      label={`${Math.abs(k.delta).toFixed(0)}%`}
                    />
                  </Stack>
                  <Typography variant="subtitle2" color="text.secondary">{k.label}</Typography>
                  <Typography variant="h5" fontWeight={800}>{currency(k.value)}</Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* ---------------- SUMMARY CHART ---------------- */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Card variant="outlined" sx={{ borderRadius: 3, }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" mb={3}>
                <Typography variant="subtitle1" fontWeight={700}>Summary</Typography>
              </Stack>

              <Box sx={{ width: "100%", height: 280, }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickCount={5} />
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
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight={700}>Cash Flow</Typography>
              </Stack>

              <Box sx={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={cashFlow} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100}>
                      {cashFlow.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => currency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
                    
              <Stack direction="row" justifyContent="center" spacing={3} mt={1} mb={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS[0] }} />
                  <Typography variant="body2">Income</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS[1] }} />
                  <Typography variant="body2">Expenses</Typography>
                </Stack>
              </Stack>
                    
              <Stack direction="row" justifyContent="center" spacing={1}>
                <Typography variant="caption">Total</Typography>
                <Typography fontWeight={800}>{currency(totalCashFlow)}</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
                    
        {/* ---------------- TRANSACTIONS TABLE ---------------- */}
        <Grid item xs={12}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="h6">Recent Transactions</Typography>
                <Select size="small" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                  {MONTHS.map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </Stack>
                
              <Divider sx={{ mb: 1 }} />
                
              <Table size="small">
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}