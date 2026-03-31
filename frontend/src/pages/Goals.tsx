import {
  Typography,
  Box,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  IconButton,
} from "@mui/material";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import ProgressBar from "../components/ProgressBar";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../axiosConfig";
import { useAuth } from "../AuthContext";

export default function Goals() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [goals, setGoals] = useState([]);

  useEffect(() => {
    if (!isLoggedIn) {
      setGoals([]);
    }
  }, [isLoggedIn]);

  const fetchGoals = async () => {
    try {
      const res = await api.get("/api/goals");
      setGoals(res.data);
    } catch (err) {
      console.error("Failed to load goals:", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchGoals();
  }, [isLoggedIn]);

  /* ADD GOAL DIALOG */
  const [openAddGoal, setOpenAddGoal] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  const handleAddGoal = () => setOpenAddGoal(true);

  const handleClose = () => {
    setOpenAddGoal(false);
    setGoalName("");
    setCurrentAmount("");
    setTargetAmount("");
  };

  const handleSaveGoal = async () => {
    const newGoal = {
      name: goalName,
      currentAmount: Number(currentAmount),
      targetAmount: Number(targetAmount),
    };

    try {
      const res = await api.post("/api/goals", newGoal);
      setGoals([...goals, res.data]);
      handleClose();
    } catch (err) {
      console.error("Failed to save goal", err);
    }
  };

  /* Update Funds */
  const [openUpdate, setOpenUpdate] = useState(false);
  const [goalToUpdate, setGoalToUpdate] = useState(null);
  const [newAmount, setNewAmount] = useState("");

  const handleOpenUpdate = (goal) => {
    setGoalToUpdate(goal);
    setNewAmount(goal.currentAmount.toString());
    setOpenUpdate(true);
  };

  /* Goal Card */
  const GoalCard = ({ goal }) => (
    <Paper sx={{ maxWidth: "40%", p: 3, mb: 3, borderRadius: "16px", boxShadow: 5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h6" fontWeight="bold">{goal.name}</Typography>
        <IconButton
          color="error"
          size="small"
          onClick={async () => {
            await api.delete(`/api/goals/${goal.id}`);
            setGoals((prev) => prev.filter((g) => g.id !== goal.id));
          }}
        >
          <DeleteIcon />
        </IconButton>
      </Box>

      <ProgressBar current={goal.currentAmount} target={goal.targetAmount} color="#3CA0CA" />

      <Button
        sx={{ backgroundColor: "green", color: "white", borderRadius: "2", mt: 1, "&:hover": { backgroundColor: "#006B01" } }}
        onClick={() => handleOpenUpdate(goal)}
      >
        Update funds
      </Button>
    </Paper>
  );

  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <Box sx={{ flex: 3 }}>
        <Typography variant="h4" fontWeight="bold">Goals</Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          Track your progress toward your financial goals.
        </Typography>

        <Button
          sx={{ mt: -2, mb: 3, backgroundColor: "green", color: "white", borderRadius: "2", "&:hover": { backgroundColor: "#006B01" } }}
          onClick={handleAddGoal}
        >
          + Add goal
        </Button>

        {goals.length === 0 && (
          <Typography color="text.secondary" sx={{ mt: -1 }}>
            No goals yet. Click "Add Goal" to get started!
          </Typography>
        )}

        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}

        {/* ADD GOAL DIALOG */}
        <Dialog open={openAddGoal} onClose={handleClose}>
          <DialogTitle sx={{ mb: -1 }}>Add New Goal</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Goal Name"
              fullWidth
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              sx={{ mt: 0.55 }}
            />
            <TextField
              label="Current Amount"
              type="number"
              fullWidth
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
            />
            <TextField
              label="Target Amount"
              type="number"
              fullWidth
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSaveGoal} variant="contained" sx={{ backgroundColor: "green" }}>
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* UPDATE FUNDS DIALOG */}
        <Dialog open={openUpdate} onClose={() => setOpenUpdate(false)}>
          <DialogTitle>Update Funds</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Typography variant="body2">
              Goal: <strong>{goalToUpdate?.name}</strong>
            </Typography>
            <TextField
              label="New Current Amount"
              type="number"
              fullWidth
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenUpdate(false)}>Cancel</Button>
            <Button
              variant="contained"
              sx={{ backgroundColor: "green" }}
              onClick={async () => {
                try {
                  const res = await api.put(`/api/goals/${goalToUpdate.id}`, {
                    currentAmount: Number(newAmount),
                  });
                  setGoals((prev) =>
                    prev.map((g) => (g.id === res.data.id ? res.data : g))
                  );
                  setOpenUpdate(false);
                } catch (err) {
                  console.error("Failed to update goal:", err);
                }
              }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}