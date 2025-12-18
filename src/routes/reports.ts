import { Router } from "express";
import { auth, AuthRequest } from "../middleware/auth";
import Epi from "../models/Epi";
import Risco from "../models/Risco";
import Setor from "../models/Setor";
import Colaborador from "../models/Colaborador";

const router = Router();

// Relatório: riscos por setor (contagem/classificação)
router.get("/riscos-por-setor", auth, async (req: AuthRequest, res) => {
  try {
    const setores = await Setor.find().lean();
    const resultado: any = [];

    for (const s of setores) {
      const riscos = await Risco.find({ setorId: s._id }).lean();
      const porClassificacao: any = {};
      riscos.forEach((r:any) => {
        porClassificacao[r.classificacao] = (porClassificacao[r.classificacao] || 0) + 1;
      });
      resultado.push({
        setorId: s._id,
        setorNome: s.nome,
        totalRiscos: riscos.length,
        porClassificacao
      });
    }
    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

// Relatório: EPIs vencidos / sem estoque
router.get("/epis-status", auth, async (req: AuthRequest, res) => {
  try {
    const hoje = new Date();
    const epis = await Epi.find().lean();
    const vencidos = epis.filter((e:any) => e.validade_ca && new Date(e.validade_ca) < hoje);
    const semEstoque = epis.filter((e:any) => e.estoque <= 0);
    res.json({
      total: epis.length,
      vencidos: vencidos.map((e:any) => ({ id: e._id, nome: e.nome, validade: e.validade_ca })),
      semEstoque: semEstoque.map((e:any) => ({ id: e._id, nome: e.nome, estoque: e.estoque }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

// Relatório simples: colaboradores por setor
// Relatório: colaboradores por setor (COM nome do setor)
router.get("/colaboradores-por-setor", auth, async (req: AuthRequest, res) => {
  try {
    const colabs = await Colaborador.find()
      .populate("setorId", "nome")
      .lean();

    const agrup: any = {};

    colabs.forEach((c: any) => {
      const setorNome = c.setorId?.nome || "Sem setor";

      if (!agrup[setorNome]) agrup[setorNome] = [];

      agrup[setorNome].push({
        id: c._id,
        nome: c.nome,
        matricula: c.matricula,
      });
    });

    res.json(agrup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

export default router;
