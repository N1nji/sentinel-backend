import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  tipo: { type: String, enum: ["admin", "comum"], default: "admin" }, // Restringi os tipos
  cargo: { type: String, default: "Técnico de Segurança" }, // Novo campo
  status: { type: String, default: "ativo" }, // Para controle de acesso
  dataCriacao: { type: Date, default: Date.now },
  tokenVersion: { type: Number, default: 0 }, // Para invalidação de tokens
});

export default mongoose.model("Usuario", UsuarioSchema);