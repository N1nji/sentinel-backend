import mongoose from "mongoose";

const EpiSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },

    categoria: {
      type: String,
      enum: [
        "protecao_auditiva",
        "protecao_visual",
        "protecao_respiratoria",
        "protecao_maos",
        "protecao_cabeca",
        "protecao_pes",
        "protecao_quedas",
        "protecao_corpo",
      ],
      required: true,
    },

    ca: { type: Number, required: true },

    validade_ca: {
      type: Date,
      required: true,
    },

    estoque: { type: Number, required: true, min: 0 },

    nivel_protecao: { type: String, required: true },

    descricao: { type: String, default: "" },

    riscosRelacionados: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Risco" },
    ],

    fotoUrl: { type: String, default: "" },

    status: {
      type: String,
      enum: ["ativo", "vencido", "sem_estoque"],
      default: "ativo",
    },
  },
  { timestamps: true }
);

// Corrige timezone SEMPRE para meio-dia (evita mudança de dia para UTC)
function normalizarData(date: Date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
}

// Função status
function calcularStatus(doc: any) {
  const hoje = new Date();

  if (doc.validade_ca < hoje) {
    doc.status = "vencido";
  } else if (doc.estoque <= 0) {
    doc.status = "sem_estoque";
  } else {
    doc.status = "ativo";
  }
}

// Ao criar o EPI
EpiSchema.pre("save", function () {
  this.validade_ca = normalizarData(this.validade_ca);
  calcularStatus(this);
});

// Ao editar o EPI
EpiSchema.pre("findOneAndUpdate", async function () {
  const update: any = this.getUpdate();
  const data = update.$set || update;

  const old = await this.model.findOne(this.getQuery());

  // Normaliza validade
  const validadeNova = data.validade_ca
    ? normalizarData(new Date(data.validade_ca))
    : old.validade_ca;

  const estoqueNovo =
    data.estoque !== undefined ? data.estoque : old.estoque;

  const tempDoc: { validade_ca: Date; estoque: number; status?: string } = {
    validade_ca: validadeNova,
    estoque: estoqueNovo,
  };

  calcularStatus(tempDoc);

  data.status = tempDoc.status;
  data.validade_ca = validadeNova;

  update.$set = data;
});

export default mongoose.model("Epi", EpiSchema);
