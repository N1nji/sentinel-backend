import mongoose from "mongoose";

const SetorSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: String
});

export default mongoose.model("Setor", SetorSchema);
