import { useCallback, useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { usePlaidLink } from "react-plaid-link";
import api from "../../axiosConfig";

interface Props {
  /** Called after a successful link + sync, so the parent can refresh transactions. */
  onImported?: (summary: {
    added: number;
    modified: number;
    removed: number;
  }) => void;
}

/**
 * Single button that walks the user through the entire Plaid bank-link flow:
 *   1. Fetch a link_token from our backend
 *   2. Open Plaid Link with that token
 *   3. On success, send the public_token + institution name back to our backend
 *   4. Call /api/plaid/sync to import transactions
 *   5. Tell the parent to re-fetch
 *
 * Uses Plaid Sandbox by default (set on the backend via PLAID_ENV=sandbox).
 * Test credentials inside Plaid Link's UI: username "user_good", password "pass_good".
 */
export default function PlaidLinkButton({ onImported }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Fetched lazily — only when the user clicks the button — to avoid
  // burning link tokens for users who never click.
  const fetchLinkToken = useCallback(async () => {
    setBusy(true);
    try {
      const res = await api.post("/api/plaid/create-link-token");
      setLinkToken(res.data.linkToken);
    } catch (err) {
      console.error("Failed to create link token:", err);
      alert("Couldn't start bank connection. Please try again.");
      setBusy(false);
    }
  }, []);

  const onSuccess = useCallback(
    async (publicToken: string, metadata: any) => {
      try {
        await api.post("/api/plaid/exchange-public-token", {
          publicToken,
          institutionName: metadata?.institution?.name ?? "Bank",
        });

        const syncRes = await api.post("/api/plaid/sync");
        onImported?.(syncRes.data);
      } catch (err) {
        console.error("Plaid exchange/sync failed:", err);
        alert("Connected bank, but couldn't import transactions. Try syncing again.");
      } finally {
        setLinkToken(null);
        setBusy(false);
      }
    },
    [onImported]
  );

  const onExit = useCallback(() => {
    // User closed Plaid Link without finishing. Reset state.
    setLinkToken(null);
    setBusy(false);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
  });

  // Once we have a token AND Plaid Link is ready, open the modal automatically
  if (linkToken && ready && busy) {
    open();
  }

  return (
    <Button
      variant="contained"
      color="success"
      startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <AccountBalanceIcon />}
      onClick={fetchLinkToken}
      disabled={busy}
    >
      {busy ? "Connecting..." : "Connect Bank"}
    </Button>
  );
}
