// backend/src/server.ts
import http from "http";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Server as IOServer } from "socket.io";

dotenv.config();

// 🔥 Rotas
import authRoutes from "./routes/auth";
import securityRoutes from "./routes/security";
import setorRoutes from "./routes/setores";
import usuarioRoutes from "./routes/usuarios";
import colaboradorRoutes from "./routes/colaboradores";
import riscoRoutes from "./routes/riscos";
import epiRoutes from "./routes/epis";
import entregasRoutes from "./routes/entregas";
import iaRoutes from "./routes/ia";
import chatRoutes from "./routes/chat";
import iaContextRoutes from "./routes/ia-context";
import reportsRoutes from "./routes/reports";
import dashboardRoutes from "./routes/dashboard";
import forecastRoutes from "./routes/forecast";
import insightsRoutes from "./routes/insights";
import notificationsRoutes from "./routes/notifications";
import sessionRoutes from "./routes/session";

const app = express();
const httpServer = http.createServer(app);

/* ======================================================
   🔥 CORS CONFIG (FUNCIONA NO NODE 22)
====================================================== */
const allowedOrigins = [
  "http://localhost:5173",
  "https://sentinelv2.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/* ======================================================
   🔥 SOCKET.IO
====================================================== */
const io = new IOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

app.set("io", io); // Torna o io acessível nas rotas

io.on("connection", (socket) => {
  console.log("🔌 Socket conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Socket desconectado:", socket.id);
  });
});

export { io };

/* ======================================================
   🔥 ROTAS
====================================================== */
app.use("/auth", authRoutes);
app.use("/setores", setorRoutes);
app.use("/usuarios", usuarioRoutes);
app.use("/colaboradores", colaboradorRoutes);
app.use("/riscos", riscoRoutes);
app.use("/epis", epiRoutes);
app.use("/entregas", entregasRoutes);
app.use("/ia", iaRoutes);
app.use("/chat", chatRoutes);
app.use("/ia-context", iaContextRoutes);
app.use("/reports", reportsRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/forecast", forecastRoutes);
app.use("/insights", insightsRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/security", securityRoutes);
app.use("/session", sessionRoutes);

/* ======================================================
   🔥 START SERVER
====================================================== */
const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => {
    console.log("🔥 MongoDB conectado!");

    httpServer.listen(PORT, () => {
      console.log(`🚀 API online na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Erro no Mongo:", err);
  });
