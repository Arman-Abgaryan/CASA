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
  Menu,
  Checkbox,
  ListItemText,
  Badge,
} from "@mui/material";

import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import api from "../axiosConfig";
import { useAuth } from "../AuthContext";
import AddTransactionModal from "../components/Transactions/AddTransactionModal";
import ImportCSVModal from "../components/Transactions/ImportCSVModal";
import TransactionTable from "../components/Transactions/TransactionTable";
import PlaidLinkButton from "../components/Transactions/PlaidLinkButton";
import SyncBankButton from "../components/Transactions/SyncBankButton";
import ManageBanksButton from "../components/Transactions/ManageBanksButton";

const currency = (n: number) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

export default function Transactions() {
  const { isLoggedIn } = useAuth();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState("This Month");
  const [openModal, setOpenModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [deleteSnackbar, setDeleteSnackbar] = useState(false);
  const [editSnackbar, setEditSnackbar] = useState(false);
  const [plaidSnackbar, setPlaidSnackbar] = useState<{
    message: string;
    severity: "success" | "info";
  } | null>(null);
  const [manageBanksOpen, setManageBanksOpen] = useState(false);
  const [bankListRefreshKey, setBankListRefreshKey] = useState(0);

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
  // Delete Single Transactions
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
  // Delete Multiple Transactions
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

  // -----------------------------------------------------
  // Edit Transaction
  // -----------------------------------------------------
  const [editTx, setEditTx] = useState<any>(null);

  // -----------------------------------------------------
  // Filter Category
  // -----------------------------------------------------
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);

  const CATEGORIES = ["Food", "Paycheck", "Bills", "Shopping", "Vacation", "Transport", "Entertainment", "Health", "Other"];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.date);
      const now = new Date();

      let dateMatch = true;
      if (dateRange === "This Month")
        dateMatch = date.getUTCMonth() === now.getMonth() && date.getUTCFullYear() === now.getFullYear();
      else if (dateRange === "Last Month") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        dateMatch = date.getUTCMonth() === lastMonth.getMonth() && date.getUTCFullYear() === lastMonth.getFullYear();
    }
    else if (dateRange === "This Year")
      dateMatch = date.getUTCFullYear() === now.getFullYear();

    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(t.category);
    return dateMatch && categoryMatch;
    });
  }, [transactions, dateRange, selectedCategories])

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
          <Select size="small" value={dateRange} onChange={(e) => setDateRange(e.target.value)} fullWidth>
            <MenuItem value="This Month">This Month</MenuItem>
            <MenuItem value="Last Month">Last Month</MenuItem>
            <MenuItem value="This Year">This Year</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <Badge badgeContent={selectedCategories.length} color="primary">
            <Button
              variant = "outlined"
              startIcon = {<FilterListIcon />}
              fullWidth
              sx = {{ height: 40 }}
              onClick={(e) => setFilterAnchor(e.currentTarget)}
            >
              Filter By Category
            </Button>
          </Badge>
          <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
            {CATEGORIES.map(cat => (
              <MenuItem key={cat} onClick={() => setSelectedCategories(prev =>
                prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
              )}>
                <Checkbox checked={selectedCategories.includes(cat)} size="small" />
                <ListItemText primary = {cat} />
              </MenuItem>
            ))}
            <MenuItem onClick={() => setSelectedCategories([])}>
              <Typography variant = "body2" color = "error"> Clear All </Typography>
            </MenuItem>
          </Menu>
        </Grid>
        <Grid item xs={12} md={6}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
            <PlaidLinkButton
              onImported={(summary) => {
                setBankListRefreshKey((prev) => prev + 1);
                fetchTransactions();
                const total = summary.added + summary.modified;
                setPlaidSnackbar({
                  message:
                    total === 0
                      ? "Bank connected, but there were no new transactions to import."
                      : `Imported ${summary.added} new transaction${summary.added === 1 ? "" : "s"} from your bank.`,
                  severity: total === 0 ? "info" : "success",
                });
              }}
            />
            <SyncBankButton onSynced={(summary) => {
              fetchTransactions();
              setPlaidSnackbar(
                summary.itemsSynced === 0
                  ? { message: "No bank connected yet — click Connect Bank first.", severity: "info" }
                  : {
                      message: `Bank refresh complete — ${summary.added + summary.modified} transaction(s) added or updated${summary.removed ? `, ${summary.removed} removed` : ""}.`,
                      severity: "success",
                    }
              );
            }} />
            <Button variant="outlined" onClick={() => setManageBanksOpen(true)}>
              Manage Banks
            </Button>
          </Stack>
        </Grid>
      </Grid>

      {/* KPI CARDS + TABLE */}
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

        <Grid item xs={12}>
          <TransactionTable
            transactions={filteredTransactions}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onOpenAdd={() => setOpenModal(true)}
            onOpenImport={() => setOpenImportModal(true)}
            onEdit={(tx) => { setEditTx(tx); setOpenModal(true); }}
          />
        </Grid>
      </Grid>

      {/* MODALS */}
      <AddTransactionModal
        open={openModal}
        onClose={() => { setOpenModal(false); setEditTx(null); }} 
        onTransactionAdded={() => {
          fetchTransactions();
          if (editTx) setEditSnackbar(true);
          else setSnackbarOpen(true);
        }}
        editTransaction={editTx}
      />

      <ImportCSVModal
        open={openImportModal}
        onClose={() => setOpenImportModal(false)}
        onImportComplete={() => {
          fetchTransactions();
          setSnackbarOpen(true);
        }}
      />

      <ManageBanksButton
        open={manageBanksOpen}
        onClose={() => setManageBanksOpen(false)}
        refreshKey={bankListRefreshKey}
        onRemoved={() => {
          setBankListRefreshKey((prev) => prev + 1);
          setPlaidSnackbar({
            message: "Bank connection removed. Existing imported transactions were kept.",
            severity: "success",
          });
        }}
      />

      {/* SNACKBARS */}
      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="success" variant="filled">Transaction added!</Alert>
      </Snackbar>

      <Snackbar open={deleteSnackbar} autoHideDuration={3000} onClose={() => setDeleteSnackbar(false)}>
        <Alert severity="success" variant="filled">Transaction deleted!</Alert>
      </Snackbar>
      <Snackbar open={editSnackbar} autoHideDuration={3000} onClose={() => setEditSnackbar(false)}>
        <Alert severity="success" variant="filled">Transaction updated!</Alert>
      </Snackbar>
      <Snackbar
        open={Boolean(plaidSnackbar)}
        autoHideDuration={4000}
        onClose={() => setPlaidSnackbar(null)}
      >
        <Alert severity={plaidSnackbar?.severity ?? "success"} variant="filled">
          {plaidSnackbar?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
