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
import { useState } from "react";

interface EditableTx {
  id: number;
  name: string;
  category: string;
  date: string;
  amount: number;
  type: string;
  bankName?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onTransactionAdded: () => void;
  bankNames?: string[];
  editTransaction?: EditableTx | null;
}

/**
 * Normalize whatever date string we got from the backend into the
 * "YYYY-MM-DD" shape that <input type="date"> requires. The backend
 * normally returns this format already, but if anything ever ships a
 * timestamp ("2025-01-01T00:00:00") we don't want the field to silently
 * stay empty — slice off the time part instead.
 */
function toInputDate(value: string): string {
  if (!value) return "";
  // Already in YYYY-MM-DD form.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // ISO with time component → take the date part.
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  // Anything else (e.g. "1/2/2025") — try Date parsing.
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return "";
}

const EMPTY_FORM = {
  name: "",
  category: "",
  date: "",
  amount: "",
  type: "income",
  bankName: "Manual",
};

/**
 * The modal is intended to be remounted (via `key` on the parent) whenever
 * the edit target changes, so we can read editTransaction once at mount
 * and skip the useEffect synchronization dance entirely.
 */
export default function AddTransactionModal({ open, onClose, onTransactionAdded, bankNames, editTransaction }: Props) {
  // Lazy initializer — runs once on mount. Because the parent passes a
  // `key` based on the editing transaction id, this initializer always sees
  // the correct editTransaction for THIS instance.
  const [newTx, setNewTx] = useState(() => {
    if (editTransaction) {
      return {
        name: editTransaction.name ?? "",
        category: editTransaction.category ?? "",
        date: toInputDate(editTransaction.date),
        amount: String(Math.abs(editTransaction.amount ?? 0)),
        type: editTransaction.type ?? (editTransaction.amount >= 0 ? "income" : "expense"),
        bankName: editTransaction.bankName || "Manual",
      };
    }
    return { ...EMPTY_FORM };
  });

  const isEditing = Boolean(editTransaction);

  const handleSave = async () => {
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
      // Branch on the captured `editTransaction` from this mount, NOT a
      // re-evaluated prop, so even if the parent's editTx state changes
      // mid-save we still correctly hit PUT vs POST.
      if (editTransaction && editTransaction.id) {
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

  const bankOptions = Array.from(new Set(["Manual", ...(bankNames || [])])).sort();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle mb={-2}>{isEditing ? "Edit Transaction" : "Add New Transaction"}</DialogTitle>
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
        <Button variant="contained" onClick={handleSave}>{isEditing ? "Save" : "Add"}</Button>
      </DialogActions>
    </Dialog>
  );
}
