import { Typography, Box, Paper, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, IconButton, Stack } from "@mui/material";
import { useState, useEffect } from "react";
import ProgressBar from "../components/ProgressBar";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../axiosConfig";
import { useAuth } from "../AuthContext";
import AnimatedPage from "../components/AnimatedPage";

export default function Goals() {
  const { isLoggedIn } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [openAddGoal, setOpenAddGoal] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [openUpdate, setOpenUpdate] = useState(false);
  const [goalToUpdate, setGoalToUpdate] = useState<any>(null);
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    if (!isLoggedIn) setGoals([]);
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

  const handleClose = () => {
    setOpenAddGoal(false);
    setGoalName("");
    setCurrentAmount("");
    setTargetAmount("");
  };

  const handleSaveGoal = async () => {
    try {
      const res = await api.post("/api/goals", { name: goalName, currentAmount: Number(currentAmount), targetAmount: Number(targetAmount) });
      setGoals([...goals, res.data]);
      handleClose();
    } catch (err) {
      console.error("Failed to save goal", err);
    }
  };

  const handleOpenUpdate = (goal: any) => {
    setGoalToUpdate(goal);
    setNewAmount(String(goal.currentAmount));
    setOpenUpdate(true);
  };

  return (
    <AnimatedPage>
      <Box>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: 30, md: 34 } }}>Goals</Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>Track your progress toward your financial goals.</Typography>

        <Button sx={{ mb: 3, backgroundColor: "green", color: "white", borderRadius: 2, "&:hover": { backgroundColor: "#006B01" } }} onClick={() => setOpenAddGoal(true)}>
          + Add goal
        </Button>

        {goals.length === 0 && <Typography color="text.secondary" sx={{ mb: 2 }}>No goals yet. Click "Add Goal" to get started!</Typography>}

        <Stack spacing={2.5}>
          {goals.map((goal) => (
            <Paper key={goal.id} sx={{ width: "100%", p: { xs: 2.25, md: 3 }, borderRadius: 3, boxShadow: 4 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">{goal.name}</Typography>
                  <Typography variant="body2" color="text.secondary">${goal.currentAmount} of ${goal.targetAmount}</Typography>
                </Box>
                <IconButton color="error" size="small" onClick={async () => { await api.delete(`/api/goals/${goal.id}`); setGoals((prev) => prev.filter((g) => g.id !== goal.id)); }}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              <ProgressBar current={goal.currentAmount} target={goal.targetAmount} color="#3CA0CA" />
              <Button sx={{ backgroundColor: "green", color: "white", borderRadius: 2, mt: 2, width: { xs: "100%", sm: "auto" }, "&:hover": { backgroundColor: "#006B01" } }} onClick={() => handleOpenUpdate(goal)}>
                Update funds
              </Button>
            </Paper>
          ))}
        </Stack>

        <Dialog open={openAddGoal} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>Add New Goal</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Goal Name" fullWidth value={goalName} onChange={(e) => setGoalName(e.target.value)} />
            <TextField label="Current Amount" type="number" fullWidth value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
            <TextField label="Target Amount" type="number" fullWidth value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSaveGoal} variant="contained" sx={{ backgroundColor: "green" }}>Save</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openUpdate} onClose={() => setOpenUpdate(false)} fullWidth maxWidth="sm">
          <DialogTitle>Update Funds</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Typography variant="body2">Goal: <strong>{goalToUpdate?.name}</strong></Typography>
            <TextField label="New Current Amount" type="number" fullWidth value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenUpdate(false)}>Cancel</Button>
            <Button
              variant="contained"
              sx={{ backgroundColor: "green" }}
              onClick={async () => {
                try {
                  const res = await api.put(`/api/goals/${goalToUpdate.id}`, { currentAmount: Number(newAmount) });
                  setGoals((prev) => prev.map((g) => (g.id === res.data.id ? res.data : g)));
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
    </AnimatedPage>
  );
}
