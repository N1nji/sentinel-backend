import { Router } from "express";
import { auth, AuthRequest } from "../middleware/auth";
import Entrega from "../models/EntregaEpi";
import Epi from "../models/Epi";
import Setor from "../models/Setor";
import Colaborador from "../models/Colaborador";
import dayjs from "dayjs";

const router = Router();

/**
 GET /dashboard/advanced?from=2025-11-01&to=2025-11-30&setorId=...&epiId=...
*/
router.get("/advanced", auth, async (req: AuthRequest, res) => {
  try {
    const { from, to, setorId, epiId, colaboradorId } = req.query as Record<string,string|undefined>;

    const filtro: any = {};

    if (from || to) {
      const f = from ? dayjs(from).startOf("day").toDate() : new Date(0);
      const t = to ? dayjs(to).endOf("day").toDate() : new Date();
      filtro.dataEntrega = { $gte: f, $lte: t };
    }

    if (epiId) filtro.epiId = epiId;
    if (colaboradorId) filtro.colaboradorId = colaboradorId;

    // se filtrar por setor, precisamos achar colaboradores do setor
    if (setorId) {
      const colabs = await Colaborador.find({ setorId }).select("_id").lean();
      const ids = colabs.map(c => c._id);
      filtro.colaboradorId = { $in: ids };
    }

    // 1) KPIs
    const totalEntregas = await Entrega.countDocuments(filtro);
    const totalUnidades = (await Entrega.aggregate([
      { $match: filtro },
      { $group: { _id: null, total: { $sum: "$quantidade" } } }
    ]))[0]?.total || 0;

    // 2) Entregas por mês (para chart)
    const entregasPorMes = await Entrega.aggregate([
      { $match: filtro },
      { $group: { _id: { year: { $year: "$dataEntrega" }, month: { $month: "$dataEntrega" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // 3) Entregas por setor
    const entregasPorSetor = await Entrega.aggregate([
      { $match: filtro },
      { $lookup: { from: "colaboradors", localField: "colaboradorId", foreignField: "_id", as: "colab" } },
      { $unwind: "$colab" },
      { $lookup: { from: "setors", localField: "colab.setorId", foreignField: "_id", as: "setor" } },
      { $unwind: "$setor" },
      { $group: { _id: "$setor.nome", total: { $sum: "$quantidade" } } },
      { $sort: { total: -1 } }
    ]);

    // 4) Top EPIs
    const topEpis = await Entrega.aggregate([
      { $match: filtro },
      { $group: { _id: "$epiSnapshot.nome", total: { $sum: "$quantidade" } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    // 5) Ranking colaboradores
    const rankingColabs = await Entrega.aggregate([
      { $match: filtro },
      { $lookup: { from: "colaboradors", localField: "colaboradorId", foreignField: "_id", as: "colab" } },
      { $unwind: "$colab" },
      { $group: { _id: "$colab.nome", total: { $sum: "$quantidade" } } },
      { $sort: { total: -1 } },
      { $limit: 20 }
    ]);

    // 6) Estoque crítico (local) — não usa filtro
    const estoqueCritico = await Epi.find({ estoque: { $lte: 5 } }).lean();

    res.json({
      kpis: { totalEntregas, totalUnidades },
      entregasPorMes,
      entregasPorSetor,
      topEpis,
      rankingColabs,
      estoqueCritico
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar dashboard avançado" });
  }
});

export default router;
