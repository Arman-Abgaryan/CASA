import { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../../axiosConfig";

interface SyncSummary {
  itemsSynced: number;
  added: number;
  modified: number;
  removed: number;
}

interface Props {
  /** Called after sync completes, so the parent can refresh transactions and show feedback. */
  onSynced?: (summary: SyncSummary) => void;
}

/**
 * Manually triggers a transaction sync against every Plaid Item the user has linked.
 *
 * The backend handles "no items linked" gracefully by returning itemsSynced: 0 —
 * the parent decides how to message that case to the user.
 */
export default function SyncBankButton({ onSynced }: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const res = await api.post("/api/plaid/sync");
      onSynced?.(res.data);
    } catch (err) {
      console.error("Sync failed:", err);
      alert("Couldn't sync transactions. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="info"
      startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
      onClick={handleClick}
      disabled={busy}
    >
      {busy ? "Syncing..." : "Refresh from Bank"}
    </Button>
  );
}
