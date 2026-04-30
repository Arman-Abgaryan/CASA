import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import api from "../../axiosConfig";
import { useState, useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onTransactionAdded: () => void;
  /**
   * Bank names already present on other transactions, used to populate the
   * Bank autocomplete dropdown. Always includes at least "Manual".
   */
  bankNames?: string[];
  editTransaction?: {
    id: number;
    name: string;
    category: string;
    date: string;
    amount: number;
    type: string;
    bankName?: string;
  };
}

export default function AddTransactionModal({ open, onClose, onTransactionAdded, bankNames, editTransaction }: Props) {
  const [newTx, setNewTx] = useState({
    name: "",
    category: "",
    date: "",
    amount: "",
    type: "income",
    bankName: "Manual",
  });

  useEffect(() => {
    if (editTransaction) {
      setNewTx({
        name: editTransaction.name,
        category: editTransaction.category,
        date: editTransaction.date,
        amount: String(Math.abs(editTransaction.amount)),
        type: editTransaction.type,
        bankName: editTransaction.bankName || "Manual",
      });
    } else {
      setNewTx({ name: "", category: "", date: "", amount: "", type: "income", bankName: "Manual" });
    }
  }, [editTransaction, open]);

  const handleAdd = async () => {
    const parsedAmount = Number(newTx.amount);
    if (!newTx.name || !newTx.category || isNaN(parsedAmount)) {
      alert("Please fill all required fields correctly.");
      return;
    }

    const txToSave = {
      description: newTx.name,
      category: newTx.category,
      date: newTx.date || new Date().toISOString().split("T")[0],
      amount: newTx.type === "expense" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
      bankName: newTx.bankName?.trim() || "Manual",
    };

    try {
      if (editTransaction) {
        await api.put(`/api/transactions/${editTransaction.id}`, txToSave);
      } else {
        await api.post("/api/transactions/add", txToSave);
      }
      onTransactionAdded();
      onClose();
    } catch (err) {
      console.error("Failed to save transaction:", err);
      alert("Failed to save transaction.");
    }
  };

  // Always offer "Manual" as a baseline option even if no other transactions exist yet.
  const bankOptions = Array.from(new Set(["Manual", ...(bankNames || [])])).sort();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle mb={-2}>{editTransaction ? "Edit Transaction" : "Add New Transaction"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
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
          {/*
            freeSolo lets the user either pick an existing bank from the dropdown
            (most common — Chase, Citibank, etc. they've already imported from)
            or type a brand-new name without us having to predefine the list.
          */}
          <Autocomplete
            freeSolo
            options={bankOptions}
            value={newTx.bankName}
            onChange={(_, value) => setNewTx({ ...newTx, bankName: (value as string) || "Manual" })}
            onInputChange={(_, value) => setNewTx({ ...newTx, bankName: value })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Bank"
                helperText="Pick from your existing banks or type a new one. Leave as 'Manual' for entries with no bank."
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleAdd}>{editTransaction ? "Save" : "Add"}</Button>
      </DialogActions>
    </Dialog>
  );
}
