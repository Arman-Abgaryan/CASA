import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Divider,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

import ProgressBar from "../components/ProgressBar";
import api from "../axiosConfig";
import { useAuth } from "../AuthContext";

export default function Budgets() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  // --------------------- Budget State --------------------- //
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    if (!isLoggedIn) {
      setBudgets([]);
    }
  }, [isLoggedIn]);

  const fetchBudgets = async () => {
    try {
      const res = await api.get("/api/budgets");
      setBudgets(res.data);
    } catch (err) {
      console.error("Failed to load budgets:", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchBudgets();
  }, [isLoggedIn]);

  // --------------------- Transactions --------------------- //
  const [transactions, setTransactions] = useState([]);

  async function fetchUserData() {
    try {
      const res = await api.get("/api/transactions");
      const transformed = res.data.map((t: any) => ({
        id: t.id,
        name: t.description,
        category: t.category || "Uncategorized",
        date: t.date,
        amount: Number(t.amount),
        type: Number(t.amount) >= 0 ? "income" : "expense",
      }));
      setTransactions(transformed);
    } catch (err) {
      console.error("Failed to fetch user data", err);
    }
  }

  useEffect(() => {
    if (isLoggedIn) fetchUserData();
  }, [isLoggedIn]);

  // Filter only THIS MONTH'S transactions
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = transactions.filter((t) => {
    const date = new Date(t.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  // --------------------- Add/Remove Budget --------------------- //
  const [openAddBudget, setOpenAddBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [resetSnackbar, setResetSnackbar] = useState(false);

  const handleAddBudget = () => setOpenAddBudget(true);

  const handleClose = () => {
    setOpenAddBudget(false);
    setBudgetAmount("");
  };

  const handleSaveBudget = async () => {
    try {
      const res = await api.post("/api/budgets", { maxAmount: Number(budgetAmount) });
      setBudgets([...budgets, res.data]);
      handleClose();
    } catch (err) {
      console.error("Failed to save budget", err);
    }
  };

  const handleResetBudgets = async () => {
    const confirmReset = window.confirm("Are you sure you want to reset this month's budget?");
    if (!confirmReset) return;

    try {
      for (const b of budgets) {
        await api.delete(`/api/budgets/${b.id}`);
      }
      setBudgets([]);
      setOpenAddBudget(true);
    } catch (err) {
      console.error("Failed to reset budgets:", err);
      alert("Failed to reset budgets.");
    }
  };

  // ------------------ Monthly Budget Calculations ------------------ //
  const totalBudget = budgets.reduce((sum, b) => sum + b.maxAmount, 0);

  const totalIncome = monthlyTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthlyTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const hasBudget = totalBudget > 0;
  const remaining = hasBudget ? totalBudget - totalExpenses : 0;
  const percentUsed = hasBudget ? (totalExpenses / totalBudget) * 100 : 0;

  let progressColor = "success.main";
  if (percentUsed >= 80) progressColor = "error.main";
  else if (percentUsed >= 50) progressColor = "#EBC106";

  let statusMessage = "You're doing great!";
  if (percentUsed >= 80) statusMessage = "Warning: You're close to exceeding your budget!";
  else if (percentUsed >= 50) statusMessage = "Careful — Spending is getting high!";

  // ---------------- PIE CHART CATEGORY DISTRIBUTION ---------------- //
  const monthlyExpensesOnly = monthlyTransactions.filter(t => t.amount < 0);

  const categoryMap: Record<string, number> = {};
  monthlyExpensesOnly.forEach(t => {
    const cat = t.category || "Uncategorized";
    const amt = Math.abs(t.amount);
    if (!categoryMap[cat]) categoryMap[cat] = 0;
    categoryMap[cat] += amt;
  });

  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const PIE_COLORS = [
    "#6EC1E4", "#F5B971", "#9CCC65",
    "#BA68C8", "#FF8A65", "#4DB6AC"
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold">Budgets</Typography>
      <Typography variant="body1" color="text.secondary" mb={2}>
        Track your spending and budget limits.
      </Typography>

      <Grid container spacing={3}>
        {/* ---------------- LEFT: Monthly Budget Summary ---------------- */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 5 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                Budget for {new Date().toLocaleString("en-US", { month: "long" })}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ my: 2 }}>
                <Typography><strong>Total Budget:</strong> ${totalBudget.toLocaleString()}</Typography>
                <Typography><strong>Income:</strong> ${totalIncome.toLocaleString()}</Typography>
                <Typography><strong>Expenses:</strong> ${totalExpenses.toLocaleString()}</Typography>
                <Typography><strong>Remaining:</strong> ${remaining.toLocaleString()}</Typography>
              </Box>

              {hasBudget ? (
                <>
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <ProgressBar current={totalExpenses} target={totalBudget} color={progressColor} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {statusMessage}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  No budget set for this month. Click "Add Budget" to begin!
                </Typography>
              )}

              <Button
                variant="contained"
                sx={{ backgroundColor: "green", color: "white", borderRadius: 2, mb: 2, mt: 2, "&:hover": { backgroundColor: "#006B01" } }}
                onClick={handleAddBudget}
              >
                + Add Budget
              </Button>

              <Button
                variant="outlined"
                color="error"
                sx={{ borderRadius: 2, ml: 2, borderColor: "error.main", color: "error.main", "&:hover": { backgroundColor: "#ffebeb" } }}
                onClick={handleResetBudgets}
              >
                Reset Budget
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* ---------------- BOTTOM: Pie Chart ---------------- */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 5 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>Budget Overview</Typography>
              <Divider sx={{ my: 2 }} />

              <Box sx={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={85}
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Box>

              <Box sx={{ mt: 3, ml: 1 }}>
                {pieData.map((item, i) => {
                  const color = item.name.toLowerCase() === "other"
                    ? "#F5B971"
                    : PIE_COLORS[i % PIE_COLORS.length];
                  return (
                    <Stack key={i} direction="row" alignItems="center" spacing={1.2} sx={{ mb: 0.8 }}>
                      <Box sx={{ width: 14, height: 14, borderRadius: 2, backgroundColor: color }} />
                      <Typography variant="body2">{item.name}</Typography>
                    </Stack>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ---------------- Add Budget Dialog ---------------- */}
      <Dialog open={openAddBudget} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Add Budget</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: -1 }}>
          <TextField
            label="Budget Amount"
            type="number"
            fullWidth
            required
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
            sx={{ mt: 0.8 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" sx={{ backgroundColor: "green" }} onClick={handleSaveBudget}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={resetSnackbar} autoHideDuration={3000} onClose={() => setResetSnackbar(false)}>
        <Alert severity="info" variant="filled">Monthly budget has been reset</Alert>
      </Snackbar>
    </Box>
  );
}