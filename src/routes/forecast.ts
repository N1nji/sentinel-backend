import { Router } from "express";
import Entrega from "../models/EntregaEpi";
import { auth } from "../middleware/auth";
import dayjs from "dayjs";

const router = Router();

router.get("/epi/:epiId/forecast", auth, async (req, res) => {
  try {
    const { epiId } = req.params;
    const months = parseInt(req.query.months as string) || 6;
    const futureMonths = parseInt(req.query.future as string) || 3;

    // agrupa entregas por mês para epiId
    const agg = await Entrega.aggregate([
      { $match: { epiId: new (require("mongoose").Types.ObjectId)(epiId) } },
      { $group: { _id: { year: { $year: "$dataEntrega" }, month: { $month: "$dataEntrega" } }, total: { $sum: "$quantidade" } } },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: months }
    ]);

    const values = agg.map(a => a.total).reverse(); // cronológico

    if (!values.length) return res.json({ forecast: [], method: "moving_average" });

    // média simples
    const avg = values.reduce((s:number,v:number)=>s+v,0)/values.length;

    const forecast = Array.from({length: futureMonths}).map((_,i)=> Math.round(avg));

    res.json({ method: "moving_average", avg, values, forecast });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro na previsão" });
  }
});

export default router;
