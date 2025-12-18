import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  tipo: { type: String, default: "admin" }
});

export default mongoose.model("Usuario", UsuarioSchema);
