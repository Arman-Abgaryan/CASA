import api from "../axiosConfig";
import { useState, useRef, useEffect } from "react";
import {
  Box,
  IconButton,
  InputBase,
  Stack,
  Typography,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SendIcon from "@mui/icons-material/Send";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface Message {
    role: "user" | "assistant"
    content: string
}

export default function AIChatWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi, I'm Benjamin, your CASA financial advisor. Ask me anything about your finances!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/api/ai/chat", { message: input.trim() });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: res.data.response,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
    };

  return (
    <Box sx={{ mx: 0, mb: 0, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {/* Header */}
        <Box
        sx = {{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#0a3d3f",
          borderRadius: collapsed ? 2 : "8px 8px 0 0",
          px: 1.5,
          py: 0.8,
          cursor: "pointer",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        onClick={() => setCollapsed(prev => !prev)}
        >
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight={600} color="white" fontFamily="'Open Sans', sans-serif">
                    AI Advisor
                </Typography>
            </Stack>
            <IconButton size="small" sx={{ color: "white", p: 0 }}>
                {collapsed ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
        </Box>

        {/* Chat Body */}
        {!collapsed && (
            <Box 
                sx = {{
                    backgroundColor: "#0a3d3f",
                    borderRadius: "0 0 8px 8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderTop: "none",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minHeight: 0,
                }}   
            >
            {/* Messages */}
            <Box sx = {{ flex: 1, overflowY: "auto", p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}> 
                {messages.map((msg, i) => (
                    <Box
                        key = {i}
                        sx = {{
                            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                            backgroundColor: msg.role === "user" ? "#1a6b6e" : "rgba(255,255,255,0.08)",
                            color: "white",
                            borderRadius: msg.role === "user" ? "12px 12px 0 12px" : "12px 12px 12px 0",
                            px: 1.5,
                            py: 0.8,
                            maxWidth: "85%",
                        }}
                    >
                        <Typography variant="caption" fontFamily="'Open Sans', sans-serif" lineHeight={1.4}>
                            {msg.content}
                        </Typography>
                    </Box>
                ))}
                {loading && (
                    <Box sx={{ alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "12px 12px 12px 0", px: 1.5, py: 0.8 }}>
                        <Typography variant="caption" color="white">...</Typography>
                    </Box>
                )}
                <div ref = {bottomRef} />
            </Box>

            {/* Input */}
            <Box
            sx ={{
                display: "flex",
                alignItems: "center",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                px: 1,
                py: 0.5,
                gap: 1,
            }}
            >
                <InputBase
                    fullWidth
                    placeholder="Ask me anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    sx={{ color: "white", fontSize: 12, fontFamily: "'Open Sans', sans-serif", "& ::placeholder": { color: "rgba(255,255,255,0.4)" } }}
                    />
                    <IconButton size="small" onClick={handleSend} disabled={loading} sx = {{ color: loading ? "rgba(255,255,255,0.3)" : "white", p: 0.5 }}>
                        <SendIcon fontSize="small" />
                    </IconButton>
                    </Box>
            </Box>
        )}
    </Box>
  );
}
