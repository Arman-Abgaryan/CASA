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
  LinearProgress,
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

const PIE_COLORS = [
  "#6EC1E4", "#F5B971", "#9CCC65",
  "#BA68C8", "#FF8A65", "#4DB6AC"
];

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 60;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.02) return null;

  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={16} fill="#333" fontFamily="Roboto, sans-serif">
      <tspan x={x} dy="-0.4em" fontWeight="bold" fill="#333">{`${(percent * 100).toFixed(0)}%`}</tspan>
      <tspan x={x} dy="1.2em" fill="#666">{name}</tspan>
    </text>
  );
};

export default function Budgets() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  // --------------------- Budget State --------------------- //
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    if (!isLoggedIn) setBudgets([]);
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

  // --------------------- Category Budgets --------------------- //
  const [categoryBudgets, setCategoryBudgets] = useState([]);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatAmount, setNewCatAmount] = useState("");

  const fetchCategoryBudgets = async () => {
    try {
      const res = await api.get("/api/category-budgets");
      setCategoryBudgets(res.data);
    } catch (err) {
      console.error("Failed to load category budgets:", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchCategoryBudgets();
  }, [isLoggedIn]);

  const handleSaveCategoryBudget = async () => {
    if (!newCatName || !newCatAmount) return;
    try {
      const budgetId = budgets.length > 0 ? budgets[0].id : null;
      if (!budgetId) {
        alert("Please set a monthly budget first.");
        return;
      }
      await api.post(`/api/category-budgets/budget/${budgetId}`, {
        category: newCatName,
        maxAmount: Number(newCatAmount),
      });
      fetchCategoryBudgets();
      setNewCatName("");
      setNewCatAmount("");
      setOpenCategoryDialog(false);
    } catch (err) {
      console.error("Failed to save category budget:", err);
    }
  };

  const handleDeleteCategoryBudget = async (id: number) => {
    try {
      await api.delete(`/api/category-budgets/${id}`);
      setCategoryBudgets(prev => prev.filter((cb: any) => cb.id !== id));
    } catch (err) {
      console.error("Failed to delete category budget:", err);
    }
  };

  // Calculate spending per category this month
  const categorySpending: Record<string, number> = {};
  monthlyTransactions
    .filter(t => t.amount < 0)
    .forEach(t => {
      const cat = t.category || "Uncategorized";
      if (!categorySpending[cat]) categorySpending[cat] = 0;
      categorySpending[cat] += Math.abs(t.amount);
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
  if (percentUsed >= 100) statusMessage = "You have exceeded your budget for the month!";
  else if (percentUsed >= 80) statusMessage = "Warning: You're close to exceeding your budget!";
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

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold">Budgets</Typography>
      <Typography variant="body1" color="text.secondary" mb={2}>
        Track your spending and budget limits.
      </Typography>

      <Grid container spacing={3}>
        {/* ---------------- LEFT COLUMN ---------------- */}
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>

            {/* Monthly Budget Card */}
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

            {/* Category Budgets Card */}
            <Card sx={{ borderRadius: 3, boxShadow: 5 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" fontWeight={700}>Category Budgets</Typography>
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ backgroundColor: "green", "&:hover": { backgroundColor: "#006B01" } }}
                    onClick={() => setOpenCategoryDialog(true)}
                  >
                    + Add
                  </Button>
                </Stack>

                <Divider sx={{ my: 2 }} />

                {categoryBudgets.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No category budgets set. Click "+ Add" to create one.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {categoryBudgets.map((cb: any) => {
                      const spent = categorySpending[cb.category] || 0;
                      const pct = Math.min((spent / cb.maxAmount) * 100, 100);
                      let barColor = "#4caf50";
                      if (pct >= 80) barColor = "#f44336";
                      else if (pct >= 50) barColor = "#EBC106";

                      return (
                        <Box key={cb.id}>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" fontWeight={600}>{cb.category}</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" color="text.secondary">
                                {currency(spent)} / {currency(cb.maxAmount)}
                              </Typography>
                              <Button
                                size="small"
                                color="error"
                                sx={{ minWidth: 0, p: 0, fontSize: 12 }}
                                onClick={() => handleDeleteCategoryBudget(cb.id)}
                              >
                                ✕
                              </Button>
                            </Stack>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: "#e0e0e0",
                              "& .MuiLinearProgress-bar": { backgroundColor: barColor, borderRadius: 4 }
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>

          </Stack>
        </Grid>

        {/* ---------------- RIGHT: Pie Chart ---------------- */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 5, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>Spending Overview</Typography>
              <Divider sx={{ my: 2 }} />

              {pieData.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No expense data for this month yet.
                </Typography>
              ) : (
                <Box sx={{ width: "100%", height: 400 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={130}
                        labelLine={true}
                        label={renderCustomLabel}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
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

      {/* ---------------- Add Category Budget Dialog ---------------- */}
      <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Category Budget</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: -1 }}>
          <TextField
            select
            label="Category"
            fullWidth
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            sx={{ mt: 0.8 }}
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
          >
            <option value="">Select a category</option>
            <option value="Food">Food</option>
            <option value="Bills">Bills</option>
            <option value="Shopping">Shopping</option>
            <option value="Transport">Transport</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Health">Health</option>
            <option value="Vacation">Vacation</option>
            <option value="Other">Other</option>
          </TextField>
          <TextField
            label="Budget Amount"
            type="number"
            fullWidth
            value={newCatAmount}
            onChange={(e) => setNewCatAmount(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCategoryDialog(false)}>Cancel</Button>
          <Button variant="contained" sx={{ backgroundColor: "green" }} onClick={handleSaveCategoryBudget}>
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