import mongoose from "mongoose";

const SetorSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: String,
  // ADICIONE ESTES DOIS:
  responsavel: { type: String, default: "" }, 
  status: { 
    type: String, 
    enum: ["ativo", "inativo"], 
    default: "ativo" // Garante que os antigos fiquem ativos por padrão
  }
}, { timestamps: true }); // Dica: timestamps ajudam a saber quando o setor foi criado

export default mongoose.model("Setor", SetorSchema);