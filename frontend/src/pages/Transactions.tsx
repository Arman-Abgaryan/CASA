import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Stack,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableSortLabel,
  IconButton,
  Checkbox,
  InputLabel,
  OutlinedInput,
  FormControl,
  FormHelperText,
} from "@mui/material";

import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/AccessTime";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { CheckboxSelection } from "../components/CheckboxSelection";

import axios from "axios";

// -----------------------------------------------------
// CONSTANTS
// -----------------------------------------------------
const COLORS = ["#6ec1e4", "#f5b971", "#9ccc65", "#ba68c8", "#ff8a65"];

const currency = (n: number) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

export default function Transactions() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const loggedIn = localStorage.getItem("loggedIn");
    const email = localStorage.getItem("email");

    setIsLoggedIn(Boolean(loggedIn && email));
    setCheckingAuth(false);
  }, []);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState("By Category");
  const [dateRange, setDateRange] = useState("This Month");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [openModal, setOpenModal] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [deleteSnackbar, setDeleteSnackbar] = useState(false);

  const [newTx, setNewTx] = useState({
    name: "",
    category: "",
    account: "",
    date: "",
    amount: "",
    type: "income",
    status: "pending",
  });

  const [openImportModal, setOpenImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!checkingAuth && !isLoggedIn) {
      setTransactions([]); // Clears transactions if logged out
    }
  }, [checkingAuth, isLoggedIn]);

  // SORT FIELD MAPPING
  const SORT_MAP: Record<string, string> = {
    transaction: "name",
    category: "category",
    account: "account",
    date: "date",
    status: "status",
    amount: "amount",
  };

  // -----------------------------------------------------
  // Fetch User Transactions
  // -----------------------------------------------------
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchTransactions = async () => {
      try {
        const res = await axios.get("http://localhost:8080/api/transactions", {
          withCredentials: true,
        });

        const transformed = res.data.map((t: any, index: number) => ({
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

    fetchTransactions();
  }, [isLoggedIn]);

  // Add new transaction
  const handleAddTransaction = async () => {
    const parsedAmount = Number(newTx.amount);

    if (!newTx.name || !newTx.category || isNaN(parsedAmount)) {
      alert("Please fill all required fields correctly.");
      return;
    }

    try {
      const txToSave = {
        description: newTx.name,
        category: newTx.category,
        date: newTx.date || new Date().toISOString().split("T")[0],
        amount:
          newTx.type === "expense"
            ? -Math.abs(parsedAmount)
            : Math.abs(parsedAmount),
      };

      await axios.post("http://localhost:8080/api/transactions/add", txToSave, {
        withCredentials: true,
      });

      const res = await axios.get("http://localhost:8080/api/transactions", {
        withCredentials: true,
      });

      const transformed = res.data.map((t: any, index: number) => ({
        id: t.id,
        name: t.description,
        category: t.category,
        account: "Bank",
        date: t.date,
        status: "completed",
        amount: t.amount,
        type: t.amount >= 0 ? "income" : "expense",
      }));

      setTransactions(transformed);
      setSnackbarOpen(true);
      setOpenModal(false);
    } catch (err) {
      console.error("Failed to save transaction:", err);
      alert("Failed to save transaction.");
    }

    setNewTx({
      name: "",
      category: "",
      account: "",
      date: "",
      amount: "",
      type: "income",
      status: "pending",
    });
  };

  // Totals
  const totalIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.amount > 0)
        .reduce((a, b) => a + b.amount, 0),
    [transactions]
  );

  const totalExpenses = useMemo(
    () =>
      transactions
        .filter((t) => t.amount < 0)
        .reduce((a, b) => a + Math.abs(b.amount), 0),
    [transactions]
  );

  const netAmount = totalIncome - totalExpenses;

  // Filtering + Sorting
  const filteredTx = transactions
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    .filter((t) => (statusFilter === "All" ? true : t.status === statusFilter))
    .sort((a, b) => {
      const sortKey = SORT_MAP[sortBy];
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  // Delete transactions

  // Delete Single Transaction
  async function handleDelete(id: number) {
    try {
      const res = await fetch(`http://localhost:8080/api/transactions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        // Remove from UI
        setTransactions(prev => prev.filter(t => t.id !== id));
        setDeleteSnackbar(true);
      } else {
        console.error("Failed to delete");
      }
    } catch (err) {
      console.error("Delete error", err);
    }
  }

  // Select Multiple Transactions
  const [selectionMode, setSelectionMode] = useState(false);

  const selection = CheckboxSelection<number>();

  // Delete Multiple Transactions
  async function handleBulkDelete() {
    const ids = Array.from(selection.selected);

    if (ids.length === 0) return;

    try {
      const res = await fetch("http://localhost:8080/api/transactions/bulk", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ids),
      });

      if (!res.ok) {
        throw new Error("Bulk delete failed");
      }

      // Remove deleted transactions from UI
      setTransactions(prev =>
        prev.filter(t => !selection.selected.has(t.id))
      );

      selection.clear();
      setSelectionMode(false);
      setDeleteSnackbar(true);

    } catch (err) {
      console.error(err);
      alert("Failed to delete selected transactions");
    }
  }

  // Import CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
      setCsvPreview([]);
      setCsvHeaders([]);
      setCsvErrors([]);
    }
  };

  const handleImport = async () => {
    if (!csvFile) return;

    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      const res = await axios.post("http://localhost:8080/api/transactions/upload", formData, {
        withCredentials: true,
      });

      if (res.data.errors) {
        setCsvErrors(res.data.errors);
      } else {
        setCsvPreview(res.data.preview);
        setCsvHeaders(res.data.headers);
        setOpenImportModal(true);
      }
    } catch (err) {
      console.error("Failed to import CSV:", err);
      alert("Failed to import CSV.");
    }
  };

  const handleConfirmImport = async () => {
    if (!csvFile) return;

    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      await axios.post("http://localhost:8080/api/transactions/upload", formData, {
        withCredentials: true,
      });

      setOpenImportModal(false);
      setCsvFile(null);
      setCsvPreview([]);
      setCsvHeaders([]);
      setCsvErrors([]);

      // Fetch updated transactions
      const res = await axios.get("http://localhost:8080/api/transactions", {
        withCredentials: true,
      });

      const transformed = res.data.map((t: any, index: number) => ({
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
      setSnackbarOpen(true);
    } catch (err) {
      console.error("Failed to import CSV:", err);
      alert("Failed to import CSV.");
    }
  };

  return (
    <Stack spacing={3}>
      {/* HEADER */}
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Transactions
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" mb={-2}>
          Comprehensive view of your finances
        </Typography>
      </Box>

      {/* FILTERS */}
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <Select
            size="small"
            value={breakdown}
            onChange={(e) => setBreakdown(e.target.value)}
            fullWidth
          >
            <MenuItem value="By Category">By Category</MenuItem>
            <MenuItem value="By Account">By Account</MenuItem>
            <MenuItem value="By Status">By Status</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <Select
            size="small"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            fullWidth
          >
            <MenuItem value="This Month">This Month</MenuItem>
            <MenuItem value="Last Month">Last Month</MenuItem>
            <MenuItem value="This Year">This Year</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            fullWidth
            sx={{ height: 40 }}
          >
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
              <Typography variant="h5" fontWeight={800}>
                {currency(totalIncome)}
              </Typography>
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
              <Typography variant="h5" fontWeight={800}>
                {currency(totalExpenses)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography fontWeight={800}>Net Amount</Typography>
              <Typography
                variant="h5"
                fontWeight={800}
                color={netAmount >= 0 ? "success.main" : "error.main"}
              >
                {currency(netAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* TABLE */}
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" mb={2}>
            <Typography variant="h6">All Transactions</Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                size="small"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button variant="contained" startIcon={<FileDownloadIcon />}>
                Export
              </Button>
              <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => setOpenImportModal(true)}>
                Import CSV
              </Button>
              <Button variant="contained" onClick={() => setOpenModal(true)}>
                + Add Transaction(s)
              </Button>
              <Button 
              variant="contained"
              color = {selectionMode ? "secondary" : "primary"}
              onClick = {() => {
                setSelectionMode(prev => !prev);
                selection.clear();
              }}
              >
                {selectionMode ? "Done Selecting" : "Select Transactions"}
              </Button>

              {selectionMode && selection.count > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleBulkDelete}
                >
                  Delete ({selection.count})
                </Button>
              )}
            </Stack>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Table size="small">
            <TableHead>
              <TableRow>
                {selectionMode && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selection.count > 0 &&
                        selection.count < filteredTx.length
                      }
                      checked = {
                        filteredTx.length > 0 &&
                        selection.count === filteredTx.length
                      }
                      onChange={() =>
                        selection.toggleMany(filteredTx.map(t => t.id))
                      }
                    />
                  </TableCell>
                )}
                {["Transaction", "Category", "Account", "Date", "Status", "Amount", "Delete"]
                  .map(header => (
                    <TableCell key={header}>{header}</TableCell>
                  ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredTx.map((t) => (
                <TableRow key={t.id} hover>

                  {selectionMode && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selection.selected.has(t.id)}
                        onChange={() => selection.toggleOne(t.id)}
                      />
                    </TableCell>
                  )}

                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {t.type === "income" ? (
                        <ArrowUpwardIcon color="success" fontSize="small" />
                      ) : (
                        <ArrowDownwardIcon color="error" fontSize="small" />
                      )}
                      <Typography fontWeight={600}>{t.name}</Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>{t.category}</TableCell>
                  <TableCell>{t.account}</TableCell>
                  <TableCell>{t.date}</TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      label={t.status}
                      color={
                        t.status === "completed"
                          ? "success"
                          : t.status === "pending"
                          ? "warning"
                          : "default"
                      }
                      icon={
                        t.status === "completed" ? (
                          <CheckCircleIcon fontSize="small" />
                        ) : (
                          <PendingIcon fontSize="small" />
                        )
                      }
                    />
                  </TableCell>

                  <TableCell
                    align="left"
                    sx={{
                      color: t.amount >= 0 ? "success.main" : "error.main",
                      fontWeight: 700,
                    }}
                  >
                    {t.amount >= 0 ? "+" : "-"}
                    {currency(Math.abs(t.amount))}
                  </TableCell>

                  <TableCell align="left">
                    <IconButton
                    color = "error"
                    size = "small"
                    disabled = {selectionMode}
                    onClick = {() => handleDelete(t.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ADD TRANSACTION MODAL */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
        <DialogTitle mb = {-2}>Add New Transaction</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography>
              Single Transaction:
            </Typography>
            <TextField
              label="Transaction Name"
              fullWidth
              value={newTx.name}
              onChange={(e) => setNewTx({ ...newTx, name: e.target.value })}
            />

            <TextField
              select
              label="Category"
              fullWidth
              value={newTx.category}
              onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
            >
              <MenuItem value="Food">Food</MenuItem>
              <MenuItem value="Paycheck">Paycheck</MenuItem>
              <MenuItem value="Bills">Bills</MenuItem>
              <MenuItem value="Shopping">Shopping</MenuItem>
              <MenuItem value="Vacation">Vacation</MenuItem>
              <MenuItem value="Transport">Transport</MenuItem>
              <MenuItem value="Entertainment">Entertainment</MenuItem>
              <MenuItem value="Health">Health</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>

            <TextField
              label="Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newTx.date}
              onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
            />

            <TextField
              label="Amount (USD)"
              type="number"
              fullWidth
              value={newTx.amount}
              onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
            />

            <Select
              fullWidth
              value={newTx.type}
              onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
            >
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
            </Select>

            <Select
              fullWidth
              value={newTx.status}
              onChange={(e) => setNewTx({ ...newTx, status: e.target.value })}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
            <Typography>
              Multiple Transactions:
            </Typography>
            <Button variant="contained">
              Upload File
            </Button>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTransaction}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* IMPORT CSV MODAL */}
      <Dialog open={openImportModal} onClose={() => setOpenImportModal(false)} fullWidth maxWidth="sm">
        <DialogTitle mb = {-2}>Import CSV</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography>
              Select CSV File:
            </Typography>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
            {csvHeaders.length > 0 && (
              <Typography>
                Detected Headers: {csvHeaders.join(", ")}
              </Typography>
            )}
            {csvPreview.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {csvHeaders.map(header => (
                      <TableCell key={header}>{header}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {csvPreview.slice(0, 20).map((row, index) => (
                    <TableRow key={index}>
                      {csvHeaders.map(header => (
                        <TableCell key={header}>{row[header]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography>No preview available.</Typography>
            )}
            {csvErrors.length > 0 && (
              <FormControl error>
                <FormHelperText>
                  {csvErrors.map((error, index) => (
                    <Typography key={index} color="error">
                      {error}
                    </Typography>
                  ))}
                </FormHelperText>
              </FormControl>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenImportModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmImport}>
            Import
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert severity="success" variant="filled">
          Transaction added!
        </Alert>
      </Snackbar>

      {/* SNACKBAR – Delete Transaction */}
      <Snackbar
        open={deleteSnackbar}
        autoHideDuration={3000}
        onClose={() => setDeleteSnackbar(false)}
      >
        <Alert severity="success" variant="filled">
          Transaction deleted!
        </Alert>
      </Snackbar>
    </Stack>
  );
}
