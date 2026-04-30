import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import api from "../../axiosConfig";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

// Columns shown in the preview table. We always render in this order regardless
// of what comes back from the backend; Gemini's normalized output uses these
// exact keys.
const PREVIEW_COLUMNS = ["date", "description", "amount", "category", "bankName"];

export default function ImportCSVModal({ open, onClose, onImportComplete }: Props) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [detectedBank, setDetectedBank] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const reset = () => {
    setCsvPreview([]);
    setCsvErrors([]);
    setDetectedBank("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
      reset();
    }
  };

  const handlePreview = async () => {
    if (!csvFile) return;

    setPreviewLoading(true);
    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      const res = await api.post("/api/transactions/upload/preview", formData);

      setCsvPreview(res.data.preview || []);
      setCsvErrors(res.data.errors || []);
      setDetectedBank(res.data.bankName || "Unknown");
    } catch (err) {
      console.error("Failed to preview CSV:", err);
      alert("Failed to preview CSV. Make sure your Gemini API key is configured on the backend.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!csvFile) return;

    setImportLoading(true);
    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      await api.post("/api/transactions/upload/confirm", formData);

      onImportComplete();
      onClose();
      setCsvFile(null);
      reset();
    } catch (err) {
      console.error("Failed to confirm CSV import:", err);
      alert("Failed to import CSV.");
    } finally {
      setImportLoading(false);
    }
  };

  const isPreviewing = previewLoading;
  const hasPreview = csvPreview.length > 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle mb={-2}>Import CSV</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info">
            Your CSV will be sent to Google Gemini, which automatically identifies the issuing bank and categorizes each transaction.
          </Alert>

          <Typography>Select CSV File:</Typography>
          <input type="file" accept=".csv" onChange={handleFileChange} />

          {detectedBank && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" color="text.secondary">Detected bank:</Typography>
              <Chip
                size="small"
                color="primary"
                icon={<AccountBalanceIcon fontSize="small" />}
                label={detectedBank}
              />
            </Stack>
          )}

          {isPreviewing && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} />
              <Typography variant="body2">Asking Gemini to parse your file…</Typography>
            </Stack>
          )}

          {hasPreview ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {PREVIEW_COLUMNS.map((header) => (
                    <TableCell key={header} sx={{ textTransform: "capitalize" }}>
                      {header === "bankName" ? "Bank" : header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {csvPreview.slice(0, 20).map((row, index) => (
                  <TableRow key={index}>
                    {PREVIEW_COLUMNS.map((header) => (
                      <TableCell key={header}>{row[header]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            !isPreviewing && <Typography color="text.secondary">No preview yet.</Typography>
          )}

          {csvErrors.length > 0 && (
            <FormControl error>
              <FormHelperText>
                {csvErrors.map((error, index) => (
                  <Typography key={index} color="error">{error}</Typography>
                ))}
              </FormHelperText>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={hasPreview ? handleConfirm : handlePreview}
          disabled={importLoading || isPreviewing || !csvFile}
          startIcon={importLoading || isPreviewing ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {importLoading
            ? "Importing..."
            : isPreviewing
              ? "Parsing..."
              : hasPreview
                ? "Confirm Import"
                : "Preview"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
