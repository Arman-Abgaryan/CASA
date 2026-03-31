import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../axiosConfig";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onTransactionAdded: () => void;
}

export default function AddTransactionModal({ open, onClose, onTransactionAdded }: Props) {
  const [newTx, setNewTx] = useState({
    name: "",
    category: "",
    date: "",
    amount: "",
    type: "income",
    status: "pending",
  });

  const handleAdd = async () => {
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

      await api.post("/api/transactions/add", txToSave);

      onTransactionAdded();
      onClose();
    } catch (err) {
      console.error("Failed to save transaction:", err);
      alert("Failed to save transaction.");
    }

    setNewTx({
      name: "",
      category: "",
      date: "",
      amount: "",
      type: "income",
      status: "pending",
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle mb={-2}>Add New Transaction</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography>Single Transaction:</Typography>
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
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleAdd}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}