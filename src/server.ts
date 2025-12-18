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

const app = express();
const httpServer = http.createServer(app);
const io = new IOServer(httpServer, { cors: { origin: "*" } });

export { io };

app.use(cors());
app.use(express.json());

// ROTAS
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

// 🔥 Porta correta SEM undefined
const PORT = process.env.PORT || 4000;

// --------------
// CONECTAR MONGO ANTES DO SERVIDOR
// --------------
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => {
    console.log("🔥 MongoDB conectado!");

    httpServer.listen(PORT, () => {
      console.log(`🚀 API online com WebSocket em http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.log("Erro no Mongo:", err));
