import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { registerSocketHandlers } from "./socket/index.js";
import { register, login, logout, getProfile } from "./controllers/authController.js";
import { getHistory } from "./controllers/historyController.js";
import { authMiddleware, socketAuthMiddleware, requireAuth } from "./middleware/authMiddleware.js";
import type { ClientToServerEvents, ServerToClientEvents } from "@quizarena/shared";

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// --- Express middleware ---
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(authMiddleware);

// --- Health check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Auth routes ---
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.post("/api/auth/logout", logout);
app.get("/api/auth/me", getProfile);
app.get("/api/history", requireAuth, getHistory);

// --- Socket.io ---
io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  registerSocketHandlers(io, socket);

  socket.on("disconnect", (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
    // Clean up player from room if they disconnect
    try {
      const { handlePlayerLeave } = require("./socket/roomHandlers.js");
      handlePlayerLeave(io, socket);
    } catch (e) {
      console.error("Error cleaning up player on disconnect:", e);
    }
  });
});

// --- Start server ---
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 QuizArena server running on http://localhost:${PORT}`);
});

export { io };
