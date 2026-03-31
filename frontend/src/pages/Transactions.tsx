import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Stack,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";

import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

import api from "../axiosConfig";
import { useAuth } from "../AuthContext";

import AddTransactionModal from "../components/Transactions/AddTransactionModal";
import ImportCSVModal from "../components/Transactions/ImportCSVModal";
import TransactionTable from "../components/Transactions/TransactionTable";

const currency = (n: number) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

export default function Transactions() {
  const { isLoggedIn } = useAuth();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState("By Category");
  const [dateRange, setDateRange] = useState("This Month");
  const [openModal, setOpenModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [deleteSnackbar, setDeleteSnackbar] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setTransactions([]);
    }
  }, [isLoggedIn]);

  // -----------------------------------------------------
  // Fetch Transactions
  // -----------------------------------------------------
  const fetchTransactions = async () => {
    try {
      const res = await api.get("/api/transactions");

      const transformed = res.data.map((t: any) => ({
        id: t.id,
        name: t.description,
        category: t.category,
        account: "Bank",
        date: t.date,
        status: "completed",
        amount: Number(t.amount),
        type: Number(t.amount) >= 0 ? "income" : "expense",
      }));

      setTransactions(transformed);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchTransactions();
  }, [isLoggedIn]);

  // -----------------------------------------------------
  // Delete Single
  // -----------------------------------------------------
  async function handleDelete(id: number) {
    try {
      await api.delete(`/api/transactions/${id}`);
      setTransactions(prev => prev.filter(t => t.id !== id));
      setDeleteSnackbar(true);
    } catch (err) {
      console.error("Delete error", err);
    }
  }

  // -----------------------------------------------------
  // Delete Bulk
  // -----------------------------------------------------
  async function handleBulkDelete(ids: number[]) {
    try {
      await api.delete("/api/transactions/bulk", { data: ids });
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      setDeleteSnackbar(true);
    } catch (err) {
      console.error(err);
      alert("Failed to delete selected transactions");
    }
  }

  // -----------------------------------------------------
  // Totals
  // -----------------------------------------------------
  const totalIncome = useMemo(
    () => transactions.filter(t => t.amount > 0).reduce((a, b) => a + b.amount, 0),
    [transactions]
  );

  const totalExpenses = useMemo(
    () => transactions.filter(t => t.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0),
    [transactions]
  );

  const netAmount = totalIncome - totalExpenses;

  return (
    <Stack spacing={3}>
      {/* HEADER */}
      <Box>
        <Typography variant="h4" fontWeight={800}>Transactions</Typography>
        <Typography variant="subtitle1" color="text.secondary" mb={-2}>
          Comprehensive view of your finances
        </Typography>
      </Box>

      {/* FILTERS */}
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <Select size="small" value={breakdown} onChange={(e) => setBreakdown(e.target.value)} fullWidth>
            <MenuItem value="By Category">By Category</MenuItem>
            <MenuItem value="By Account">By Account</MenuItem>
            <MenuItem value="By Status">By Status</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <Select size="small" value={dateRange} onChange={(e) => setDateRange(e.target.value)} fullWidth>
            <MenuItem value="This Month">This Month</MenuItem>
            <MenuItem value="Last Month">Last Month</MenuItem>
            <MenuItem value="This Year">This Year</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button variant="outlined" startIcon={<FilterListIcon />} fullWidth sx={{ height: 40 }}>
            Filters
          </Button>
        </Grid>
      </Grid>

      {/* KPI CARDS */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={1}>
                <ArrowUpwardIcon color="success" />
                <Typography>Total Income</Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800}>{currency(totalIncome)}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={1}>
                <ArrowDownwardIcon color="error" />
                <Typography>Total Expenses</Typography>
              </Stack>
              <Typography variant="h5" fontWeight={800}>{currency(totalExpenses)}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography fontWeight={800}>Net Amount</Typography>
              <Typography variant="h5" fontWeight={800} color={netAmount >= 0 ? "success.main" : "error.main"}>
                {currency(netAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* TABLE */}
      <TransactionTable
        transactions={transactions}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        onOpenAdd={() => setOpenModal(true)}
        onOpenImport={() => setOpenImportModal(true)}
      />

      {/* MODALS */}
      <AddTransactionModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onTransactionAdded={() => {
          fetchTransactions();
          setSnackbarOpen(true);
        }}
      />

      <ImportCSVModal
        open={openImportModal}
        onClose={() => setOpenImportModal(false)}
        onImportComplete={() => {
          fetchTransactions();
          setSnackbarOpen(true);
        }}
      />

      {/* SNACKBARS */}
      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="success" variant="filled">Transaction added!</Alert>
      </Snackbar>

      <Snackbar open={deleteSnackbar} autoHideDuration={3000} onClose={() => setDeleteSnackbar(false)}>
        <Alert severity="success" variant="filled">Transaction deleted!</Alert>
      </Snackbar>
    </Stack>
  );
}