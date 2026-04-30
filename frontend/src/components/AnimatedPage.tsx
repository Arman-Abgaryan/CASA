import { Box } from "@mui/material";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function AnimatedPage({ children }: Props) {
  return (
    <Box
      sx={{
        animation: "pageEnter 420ms ease-out",
        "@keyframes pageEnter": {
          from: { opacity: 0, transform: "translateY(16px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      {children}
    </Box>
  );
}
