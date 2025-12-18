// backend/src/models/EntregaEpi.ts
import mongoose from "mongoose";

const EntregaSchema = new mongoose.Schema(
  {
    colaboradorId: { type: mongoose.Schema.Types.ObjectId, ref: "Colaborador", required: true },
    epiId: { type: mongoose.Schema.Types.ObjectId, ref: "Epi", required: true },

    // snapshot para auditoria (congelado no momento da entrega)
    epiSnapshot: {
      nome: String,
      ca: Number,
      validade_ca: Date,
      nivel_protecao: String,
      fotoUrl: String,
    },

    quantidade: { type: Number, required: true, min: 1 },

    dataEntrega: { type: Date, default: () => new Date() },

    entreguePor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },

    observacao: { type: String, default: "" },

    // assinatura guardada em base64 (opcional)
    assinaturaBase64: { type: String, default: "" },

    // status no momento da entrega (vencido/valido)
    validadeStatus: { type: String, enum: ["valido", "vencido"], default: "valido" },

    devolvida: { type: Boolean, default: false },
    dataDevolucao: Date,

    devolvidoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
    
    observacaoDevolucao: String,

    assinaturaDevolucaoBase64: { type: String, default: "" },

  },
  { timestamps: true }
);

export default mongoose.model("EntregaEpi", EntregaSchema);
