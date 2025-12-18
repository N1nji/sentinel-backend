import mongoose from "mongoose";

const RiscoSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    categoria: {
      type: String,
      enum: ["fisico", "quimico", "biologico", "ergonomico", "acidente"],
      required: true,
    },

    setorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Setor",
      required: true,
    },

    descricao: { type: String, default: "" },

    probabilidade: { type: Number, min: 1, max: 5, default: 1 },
    severidade: { type: Number, min: 1, max: 5, default: 1 },

    nivel: { type: Number, default: 1 },

    classificacao: {
      type: String,
      enum: ["baixo", "moderado", "medio", "alto", "critico"],
      default: "baixo",
    },

    medidas: { type: String, default: "" },
    responsavel: { type: String, default: "" },

    status: {
      type: String,
      enum: ["ativo", "controlado"],
      default: "ativo",
    },
  },
  { timestamps: true }
);

// ----------------------------
// FUNÇÃO QUE CALCULA A MATRIZ
// ----------------------------
function calcularClassificacao(doc: any) {
  doc.nivel = doc.probabilidade * doc.severidade;

  if (doc.nivel <= 4) doc.classificacao = "baixo";
  else if (doc.nivel <= 8) doc.classificacao = "moderado";
  else if (doc.nivel <= 12) doc.classificacao = "medio";
  else if (doc.nivel <= 18) doc.classificacao = "alto";
  else doc.classificacao = "critico";
}

// Ao CRIAR risco
RiscoSchema.pre("save", async function () {
  calcularClassificacao(this);
});

// Ao EDITAR risco via findOneAndUpdate
RiscoSchema.pre("findOneAndUpdate", async function () {
  const update: any = this.getUpdate();

  const data = update.$set || update;

  if (data.probabilidade || data.severidade) {
    // recalcular com valores novos OU antigos caso não enviados
    const prob = data.probabilidade ?? this.get("probabilidade");
    const sev = data.severidade ?? this.get("severidade");

    data.nivel = prob * sev;

    if (data.nivel <= 4) data.classificacao = "baixo";
    else if (data.nivel <= 8) data.classificacao = "moderado";
    else if (data.nivel <= 12) data.classificacao = "medio";
    else if (data.nivel <= 18) data.classificacao = "alto";
    else data.classificacao = "critico";

    update.$set = data;
  }
});

export default mongoose.model("Risco", RiscoSchema);