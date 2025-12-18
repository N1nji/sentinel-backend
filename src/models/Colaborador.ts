import mongoose from "mongoose";

const ColaboradorSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    matricula: { type: String, required: true, unique: true },
    funcao: { type: String, required: true },
    telefone: { type: String },
    email: { type: String },
    ativo: { type: Boolean, default: true },

    setorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Setor",
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Colaborador", ColaboradorSchema);
