import { useState, useRef, useEffect } from "react";
import {
  Box,
  IconButton,
  InputBase,
  Typography,
  Fab,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import api from "../axiosConfig";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
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
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
  
    try {
      const res = await api.post("/api/ai/chat", {
        message: input.trim(),
        history: updatedMessages.slice(0, -1).map(m => ({
          role: m.role,
          content: m.content,
        })),
      });
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
    <>
      {/* Floating Button */}
      <Fab
        onClick={() => setOpen(prev => !prev)}
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
          backgroundColor: "white",
          color: "#052e30",
          "&:hover": { backgroundColor: "#f0f0f0" },
          zIndex: 1300,
        }}
      >
        {open ? <CloseIcon /> : <AutoAwesomeIcon />}
      </Fab>

      {/* Chat Window */}
      {open && (
        <Box
          sx={{
            position: "fixed",
            bottom: 100,
            right: 32,
            width: 360,
            height: 480,
            backgroundColor: "#052e30",
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1300,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {/* Header */}
          <Box sx={{
            px: 2,
            py: 1.5,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}>
            <AutoAwesomeIcon sx={{ color: "#6ec1e4", fontSize: 18 }} />
            <Typography variant="body2" fontWeight={700} color="white" fontFamily="'Open Sans', sans-serif">
              AI Advisor — Benjamin
            </Typography>
          </Box>

          {/* Messages */}
          <Box sx={{ flex: 1, overflowY: "auto", p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  backgroundColor: msg.role === "user" ? "#1a6b6e" : "rgba(255,255,255,0.08)",
                  color: "white",
                  borderRadius: msg.role === "user" ? "12px 12px 0 12px" : "12px 12px 12px 0",
                  px: 1.5,
                  py: 0.8,
                  maxWidth: "85%",
                }}
              >
                <Typography variant="caption" fontFamily="'Open Sans', sans-serif" lineHeight={1.5}>
                  {msg.content}
                </Typography>
              </Box>
            ))}
            {loading && (
              <Box sx={{ alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "12px 12px 12px 0", px: 1.5, py: 0.8 }}>
                <Typography variant="caption" color="white">...</Typography>
              </Box>
            )}
            <div ref={bottomRef} />
          </Box>

          {/* Input */}
          <Box sx={{
            display: "flex",
            alignItems: "center",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            px: 1.5,
            py: 1,
            gap: 1,
          }}>
            <InputBase
              fullWidth
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              sx={{ color: "white", fontSize: 13, fontFamily: "'Open Sans', sans-serif", "& ::placeholder": { color: "rgba(255,255,255,0.4)" } }}
            />
            <IconButton size="small" onClick={handleSend} disabled={loading} sx={{ color: loading ? "rgba(255,255,255,0.3)" : "white" }}>
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}
    </>
  );
}