import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/AccessTime";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { useState } from "react";
import { CheckboxSelection } from "../CheckboxSelection";
import EditIcon from "@mui/icons-material/Edit";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { Menu, MenuItem } from "@mui/material";

const currency = (n: number) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

interface Transaction {
  id: number;
  name: string;
  category: string;
  date: string;
  status: string;
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

export default function TransactionTable({
  transactions,
  onDelete,
  onBulkDelete,
  onOpenAdd,
  onOpenImport,
  onOpenStatement,
  onEdit,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const selection = CheckboxSelection<number>();

  const filteredTx = transactions
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTxId, setMenuTxId] = useState<number | null>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, id: number) => {
    setMenuAnchor(e.currentTarget);
    setMenuTxId(id);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuTxId(null);
  };

  const handleMenuDelete = () => {
    if (menuTxId !== null) onDelete(menuTxId);
    handleMenuClose();
  };

  return (
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
            <Button variant="contained" onClick={onOpenAdd}>
              Add Transaction
            </Button>
            <Button variant="contained" startIcon={<UploadFileIcon />} onClick={onOpenImport}>
              Import CSV
            </Button>
            <Button variant="contained" startIcon={<AccountBalanceIcon />} onClick={onOpenStatement}>
              Upload Statement
            </Button>
            <Button variant="contained" startIcon={<FileDownloadIcon />}>
              Export
            </Button>
            <Button
              variant="contained"
              color={selectionMode ? "success" : "primary"}
              onClick={() => {
                setSelectionMode((prev) => !prev);
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
                onClick={() => onBulkDelete(Array.from(selection.selected))}
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
                    indeterminate={selection.count > 0 && selection.count < filteredTx.length}
                    checked={filteredTx.length > 0 && selection.count === filteredTx.length}
                    onChange={() => selection.toggleMany(filteredTx.map((t) => t.id))}
                  />
                </TableCell>
              )}
              {["Transaction", "Category", "Date", "Status", "Amount", "actions"].map((header) => (
                <TableCell key={header}>{header === "actions" ? "" : header}</TableCell>
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
                <TableCell>{t.date}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={t.status}
                    color={t.status === "completed" ? "success" : t.status === "pending" ? "warning" : "default"}
                    icon={t.status === "completed" ? <CheckCircleIcon fontSize="small" /> : <PendingIcon fontSize="small" />}
                  />
                </TableCell>
                <TableCell align="left" sx={{ color: t.amount >= 0 ? "success.main" : "error.main", fontWeight: 700 }}>
                  {t.amount >= 0 ? "+" : "-"}
                  {currency(Math.abs(t.amount))}
                </TableCell>
                <TableCell align="left">
                  <IconButton
                    size="small"
                    disabled={selectionMode}
                    onClick={(e) => handleMenuOpen(e, t.id)}
                    sx={{ color: "grey.500" }}
                  >
                    <MoreHorizIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
          <MenuItem onClick={() => { onEdit(filteredTx.find(t => t.id === menuTxId)!); handleMenuClose(); }}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
          </MenuItem>
          <MenuItem onClick={handleMenuDelete} sx={{ color: "error.main" }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
}