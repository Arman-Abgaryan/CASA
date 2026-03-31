import {
  Button,
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
import api from "../../axiosConfig";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function ImportCSVModal({ open, onClose, onImportComplete }: Props) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
      setCsvPreview([]);
      setCsvHeaders([]);
      setCsvErrors([]);
    }
  };

  const handlePreview = async () => {
    if (!csvFile) return;

    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      const res = await api.post("/api/transactions/upload/preview", formData);

      setCsvPreview(res.data.preview);
      setCsvHeaders(Object.keys(res.data.preview[0] || {}));
      setCsvErrors(res.data.errors || []);
    } catch (err) {
      console.error("Failed to preview CSV:", err);
      alert("Failed to preview CSV.");
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
      setCsvPreview([]);
      setCsvHeaders([]);
      setCsvErrors([]);
    } catch (err) {
      console.error("Failed to confirm CSV import:", err);
      alert("Failed to import CSV.");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle mb={-2}>Import CSV</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography>Select CSV File:</Typography>
          <input type="file" accept=".csv" onChange={handleFileChange} />
          {csvHeaders.length > 0 && (
            <Typography>Detected Headers: {csvHeaders.join(", ")}</Typography>
          )}
          {csvPreview.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {csvHeaders.map(header => (
                    <TableCell key={header}>{header}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {csvPreview.slice(0, 20).map((row, index) => (
                  <TableRow key={index}>
                    {csvHeaders.map(header => (
                      <TableCell key={header}>{row[header]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography>No preview available.</Typography>
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
          onClick={csvPreview.length > 0 ? handleConfirm : handlePreview}
          disabled={importLoading}
          startIcon={importLoading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {importLoading ? "Importing..." : csvPreview.length > 0 ? "Confirm Import" : "Preview"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}