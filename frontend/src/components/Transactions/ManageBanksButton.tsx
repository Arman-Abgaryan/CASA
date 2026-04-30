import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../../axiosConfig";

interface PlaidItem {
  id: number;
  institutionName: string;
  lastSyncedAt?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  refreshKey?: number;
  onRemoved?: () => void;
}

const formatSyncedAt = (value?: string) => {
  if (!value) return "Never synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never synced";
  return `Last synced ${date.toLocaleString()}`;
};

export default function ManageBanksButton({ open, onClose, refreshKey, onRemoved }: Props) {
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/plaid/items");
      setItems(res.data);
    } catch (err) {
      console.error("Failed to load linked banks:", err);
      setError("Couldn't load your connected banks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open, refreshKey]);

  const handleRemove = async (id: number) => {
    setRemovingId(id);
    setError(null);
    try {
      await api.delete(`/api/plaid/items/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      onRemoved?.();
    } catch (err) {
      console.error("Failed to remove bank:", err);
      setError("Couldn't remove that bank connection.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Manage Connected Banks</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Remove bank connections you no longer want linked through Plaid.
            Existing imported transactions will stay in your account.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          {loading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={28} />
            </Box>
          ) : items.length === 0 ? (
            <Alert severity="info">No banks connected yet.</Alert>
          ) : (
            <List disablePadding>
              {items.map((item) => (
                <ListItem
                  key={item.id}
                  divider
                  secondaryAction={
                    <Tooltip title="Remove connection">
                      <span>
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleRemove(item.id)}
                          disabled={removingId === item.id}
                        >
                          {removingId === item.id ? (
                            <CircularProgress size={18} color="inherit" />
                          ) : (
                            <DeleteIcon />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={item.institutionName || "Bank"}
                    secondary={formatSyncedAt(item.lastSyncedAt)}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={loadItems} disabled={loading}>
          Refresh List
        </Button>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
