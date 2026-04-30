import { Box, Paper, Typography } from "@mui/material";
import AnimatedPage from "../components/AnimatedPage";

export default function Report() {
  return (
    <AnimatedPage>
      <Box>
        <Typography variant="h4" fontWeight={800} mb={2}>Report</Typography>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
          <Typography color="text.secondary">Reports will appear here.</Typography>
        </Paper>
      </Box>
    </AnimatedPage>
  );
}
