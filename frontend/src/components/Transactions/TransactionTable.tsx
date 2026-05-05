import { Button, Card, CardContent, Checkbox, Chip, Divider, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Menu, MenuItem } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import EditIcon from "@mui/icons-material/Edit";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useState } from "react";
import { CheckboxSelection } from "../CheckboxSelection";

const currency = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

interface Transaction {
  id: number;
  name: string;
  category: string;
  date: string;
  // Source of the transaction. For Plaid: institution name (e.g. "Chase").
  // For CSV: bank detected by Gemini. For manual entries: "Manual".
  bankName: string;
  amount: number;
  type: string;
}

interface Props {
  transactions: Transaction[];
  onDelete: (id: number) => void;
  onBulkDelete: (ids: number[]) => void;
  onOpenAdd: () => void;
  onOpenImport: () => void;
  onOpenStatement: () => void;
  onEdit: (tx: Transaction) => void;
}

// Pick a chip color from the bank name. Stable across renders, no extra config.
const bankChipColor = (name?: string) => {
  if (!name) return "default" as const;
  if (name === "Manual") return "default" as const;
  const palette = ["primary", "secondary", "success", "warning", "info"] as const;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
};

export default function TransactionTable({ transactions, onDelete, onBulkDelete, onOpenAdd, onOpenImport, onOpenStatement, onEdit }: Props) {
  const [search, setSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const selection = CheckboxSelection<number>();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTxId, setMenuTxId] = useState<number | null>(null);

  const filteredTx = transactions.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (a.date < b.date ? 1 : -1));

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuTxId(null);
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={2} mb={2}>
          <Typography variant="h6">All Transactions</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
            <TextField size="small" placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: { xs: "100%", sm: 220 } }} />
            <Button variant="contained" onClick={onOpenAdd}>Add Transaction</Button>
            <Button variant="contained" startIcon={<UploadFileIcon />} onClick={onOpenImport}>Import CSV</Button>
            <Button variant="contained" startIcon={<UploadFileIcon />} onClick={onOpenStatement}>Upload Statement</Button>
            <Button variant="contained" startIcon={<FileDownloadIcon />}>Export</Button>
            <Button variant="contained" color={selectionMode ? "success" : "primary"} onClick={() => { setSelectionMode((prev) => !prev); selection.clear(); }}>
              {selectionMode ? "Done Selecting" : "Select Transactions"}
            </Button>
            {selectionMode && selection.count > 0 && <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={() => onBulkDelete(Array.from(selection.selected))}>Delete ({selection.count})</Button>}
          </Stack>
        </Stack>

        <Divider sx={{ mb: 2 }} />
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                {selectionMode && <TableCell padding="checkbox"><Checkbox indeterminate={selection.count > 0 && selection.count < filteredTx.length} checked={filteredTx.length > 0 && selection.count === filteredTx.length} onChange={() => selection.toggleMany(filteredTx.map((t) => t.id))} /></TableCell>}
                {["Transaction", "Category", "Date", "Bank", "Amount", ""].map((header) => <TableCell key={header}>{header}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTx.map((t) => (
                <TableRow key={t.id} hover>
                  {selectionMode && <TableCell padding="checkbox"><Checkbox checked={selection.selected.has(t.id)} onChange={() => selection.toggleOne(t.id)} /></TableCell>}
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {t.type === "income" ? <ArrowUpwardIcon color="success" fontSize="small" /> : <ArrowDownwardIcon color="error" fontSize="small" />}
                      <Typography fontWeight={600}>{t.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell>{t.date}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={t.bankName || "Unknown"}
                      color={bankChipColor(t.bankName)}
                      variant={t.bankName === "Manual" ? "outlined" : "filled"}
                      icon={<AccountBalanceIcon fontSize="small" />}
                    />
                  </TableCell>
                  <TableCell sx={{ color: t.amount >= 0 ? "success.main" : "error.main", fontWeight: 700 }}>{t.amount >= 0 ? "+" : "-"}{currency(Math.abs(t.amount))}</TableCell>
                  <TableCell>
                    <IconButton size="small" disabled={selectionMode} onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuTxId(t.id); }} sx={{ color: "grey.500" }}>
                      <MoreHorizIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
          <MenuItem onClick={() => { const tx = filteredTx.find((t) => t.id === menuTxId); if (tx) onEdit(tx); handleMenuClose(); }}><EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit</MenuItem>
          <MenuItem onClick={() => { if (menuTxId !== null) onDelete(menuTxId); handleMenuClose(); }} sx={{ color: "error.main" }}><DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete</MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
}
