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
import UploadFileIcon from "@mui/icons-material/UploadFile";
import api from "../../axiosConfig";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function UploadStatementModal({ open, onClose, onImportComplete }: Props) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPdfFile(e.target.files[0]);
      setPreview([]);
      setHeaders([]);
      setErrors([]);
    }
  };

  const handlePreview = async () => {
    if (!pdfFile) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", pdfFile);

    try {
      const res = await api.post("/api/bank-statement/preview", formData);
      const data = res.data.preview;
      setPreview(data);
      setHeaders(data.length > 0 ? Object.keys(data[0]) : []);
      setErrors(res.data.errors || []);
    } catch (err) {
      setErrors(["Failed to process bank statement. Please try again."]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await api.post("/api/bank-statement/save", preview);
      onImportComplete();
      onClose();
      setPdfFile(null);
      setPreview([]);
      setHeaders([]);
      setErrors([]);
    } catch (err) {
      setErrors(["Failed to import transactions. Please try again."]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setPdfFile(null);
    setPreview([]);
    setHeaders([]);
    setErrors([]);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Upload Bank Statement</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography variant="body2" color="text.secondary">
            Upload a PDF bank statement and Benjamin will automatically extract your transactions.
          </Typography>

          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFileIcon />}
            sx={{ alignSelf: "flex-start", textTransform: "none" }}
          >
            {pdfFile ? pdfFile.name : "Choose PDF File"}
            <input type="file" accept=".pdf" hidden onChange={handleFileChange} />
          </Button>

          {preview.length > 0 ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Found <strong>{preview.length}</strong> transactions. Review below and confirm to import.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {headers.map(h => (
                      <TableCell key={h} sx={{ textTransform: "capitalize", fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.slice(0, 20).map((row, i) => (
                    <TableRow key={i}>
                      {headers.map(h => (
                        <TableCell key={h}
                          sx={{ color: h === "amount" ? (Number(row[h]) >= 0 ? "success.main" : "error.main") : "inherit", fontWeight: h === "amount" ? 700 : 400 }}
                        >
                          {h === "amount" ? `${Number(row[h]) >= 0 ? "+" : ""}${Number(row[h]).toFixed(2)}` : row[h]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {preview.length > 20 && (
                <Typography variant="caption" color="text.secondary">
                  Showing first 20 of {preview.length} transactions.
                </Typography>
              )}
            </>
          ) : (
            !loading && pdfFile && (
              <Typography variant="body2" color="text.secondary">
                Click "Preview" to extract transactions from your statement.
              </Typography>
            )
          )}

          {errors.length > 0 && (
            <FormControl error>
              <FormHelperText>
                {errors.map((e, i) => (
                  <Typography key={i} color="error" variant="caption" display="block">{e}</Typography>
                ))}
              </FormHelperText>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={preview.length > 0 ? handleConfirm : handlePreview}
          disabled={!pdfFile || loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ backgroundColor: "#052e30", "&:hover": { backgroundColor: "#0a3d3f" } }}
        >
          {loading ? "Processing..." : preview.length > 0 ? "Confirm Import" : "Preview"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}