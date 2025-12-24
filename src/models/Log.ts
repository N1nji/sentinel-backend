import mongoose from "mongoose";

const LogSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
  acao: { type: String, required: true }, // Ex: "Realizou entrega de EPI"
  detalhes: { type: String }, // Ex: "Capacete para João Silva"
  ip: { type: String }, // Opcional, para segurança
  data: { type: Date, default: Date.now }
});

export default mongoose.model("Log", LogSchema);