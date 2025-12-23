// backend/src/routes/entregas.ts
import { Router } from "express";
import mongoose from "mongoose";
import Entrega from "../models/EntregaEpi";
import Epi from "../models/Epi";
import { auth, AuthRequest } from "../middleware/auth";
import { notifyLowStock } from "../utils/notifyLowStock";
import { onlyAdmin } from "../middleware/admin";

const router = Router();

/* ==========================
   LISTAR TODAS AS ENTREGAS
========================== */
router.get("/", auth, async (req, res) => {
  try {
    const entregas = await Entrega.find()
      .populate("colaboradorId", "nome matricula")
      .populate("entreguePor", "nome email")
      .populate("devolvidoPor", "nome email")
      .sort({ createdAt: -1 });

    res.json(entregas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar entregas" });
  }
});

/* ==========================
   CRIAR ENTREGA (TRANSAÇÃO)
========================== */
router.post("/", auth, async (req: AuthRequest, res) => {
  const { colaboradorId, epiId, quantidade = 1, observacao = "", assinaturaBase64 = "" } = req.body;
  const userId = req.userId;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Busca EPI
    const epi = await Epi.findById(epiId).session(session);
    if (!epi) {
      await session.abortTransaction();
      return res.status(400).json({ error: "EPI inválido" });
    }

    if (epi.estoque < quantidade) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Estoque insuficiente" });
    }

    // Decrementa estoque
    epi.estoque -= quantidade;
    await epi.save({ session });

    // Snapshot
    const snapshot = {
      nome: epi.nome,
      ca: epi.ca,
      validade_ca: epi.validade_ca,
      nivel_protecao: epi.nivel_protecao,
      fotoUrl: epi.fotoUrl,
    };
    const validadeStatus = epi.validade_ca < new Date() ? "vencido" : "valido";

    const entrega = await Entrega.create(
      [
        {
          colaboradorId,
          epiId,
          quantidade,
          entreguePor: userId,
          observacao,
          assinaturaBase64,
          epiSnapshot: snapshot,
          validadeStatus,
        },
      ],
      { session }
    );

    // Commit
    await session.commitTransaction();
    session.endSession();

    // Notificação via Socket.io
    const io = req.app.get("io"); // Pega a instância do socket
    if (io) {
      io.emit("nova_entrega", { 
        msg: "Nova entrega realizada!", 
        epi: epi.nome 
      });
    }

    // Webhook se estoque baixo
    if (epi.estoque <= 5) notifyLowStock(epi);

    // Popular e retornar
    const entregaFull = await Entrega.findById(entrega[0]._id)
      .populate("colaboradorId", "nome matricula")
      .populate("entreguePor", "nome email");

    res.json(entregaFull);

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(500).json({ error: "Erro ao registrar entrega" });
  }
});

/* ============================================================
   DELETAR ENTREGA (RESTRITO: ADMIN/GESTOR) + TRAVA SEGURANÇA
============================================================ */

router.delete("/:id", auth, onlyAdmin, async (req, res) => {
  try {
    const entrega = await Entrega.findById(req.params.id);
    if (!entrega) return res.status(404).json({ error: "Entrega não encontrada" });

    // Se o item NÃO foi devolvido, precisamos devolver pro estoque antes de apagar o registro
    if (!entrega.devolvida) {
      const epi = await Epi.findById(entrega.epiId);
      if (epi) {
        epi.estoque += entrega.quantidade;
        await epi.save();
      }
    }

    await entrega.deleteOne();
    res.json({ msg: "Registro excluído com sucesso e estoque ajustado." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar registro." });
  }
});

/* ==========================
   RELATÓRIO AGREGADO
========================== */
router.get("/report", auth, async (req, res) => {
  try {
    const { from, to } = req.query;

    const match: any = {};
    if (from || to) match.dataEntrega = {};
    if (from) match.dataEntrega.$gte = new Date(from as string);
    if (to) {
      const end = new Date(to as string);
      end.setHours(23, 59, 59);
      match.dataEntrega.$lte = end;
    }

    const byEpi = await Entrega.aggregate([
      { $match: match },
      { $group: { _id: "$epiId", total: { $sum: "$quantidade" } } },
      {
        $lookup: {
          from: "epis",
          localField: "_id",
          foreignField: "_id",
          as: "epi",
        },
      },
      { $unwind: "$epi" },
      { $project: { nome: "$epi.nome", total: 1, estoqueAtual: "$epi.estoque" } },
    ]);

    const byColaborador = await Entrega.aggregate([
      { $match: match },
      { $group: { _id: "$colaboradorId", total: { $sum: "$quantidade" } } },
      {
        $lookup: {
          from: "colaboradors",
          localField: "_id",
          foreignField: "_id",
          as: "colaborador",
        },
      },
      { $unwind: "$colaborador" },
      { $project: { nome: "$colaborador.nome", total: 1 } },
    ]);

    res.json({ byEpi, byColaborador });

  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

/* ==========================
   IA SIMPLES — SUGERIR EPIs
========================== */
router.post("/ia-suggest", auth, async (req, res) => {
  try {
    const { riscos } = req.body;

    const candidatos = await Epi.find({
      riscosRelacionados: { $in: riscos },
      estoque: { $gt: 0 },
    });

    const rankeados = candidatos
      .map(ep => ({
        ep,
        matches: (ep.riscosRelacionados || []).filter((r: any) =>
          riscos.includes(String(r))
        ).length,
      }))
      .sort((a, b) => b.matches - a.matches)
      .map(x => x.ep);

    res.json(rankeados);

  } catch (err) {
    res.status(500).json({ error: "Erro na IA" });
  }
});

/* ==========================
   DEVOLUÇÃO DE EPI (TRANSAÇÃO)
========================== */
router.post("/:id/devolucao", auth, async (req: AuthRequest, res) => {
  const { observacao = "", assinaturaBase64 = "" } = req.body;
  const userId = req.userId;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const entrega = await Entrega.findById(req.params.id).session(session);
    if (!entrega) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Entrega não encontrada" });
    }

    if (entrega.devolvida) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Entrega já foi devolvida" });
    }

    const epi = await Epi.findById(entrega.epiId).session(session);
    if (!epi) {
      await session.abortTransaction();
      return res.status(400).json({ error: "EPI não encontrado" });
    }

    // 🔁 Restaura estoque
    epi.estoque += entrega.quantidade;
    await epi.save({ session });

    // 🔁 Marca entrega como devolvida
    entrega.devolvida = true;
    entrega.dataDevolucao = new Date();
    entrega.devolvidoPor = new mongoose.Types.ObjectId(userId);
    entrega.observacaoDevolucao = observacao;
    entrega.assinaturaDevolucaoBase64 = assinaturaBase64;

    await entrega.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Notificação via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.emit("nova_entrega", { msg: "Item devolvido ao estoque" });
    }

    // Retorna entrega populada
    const entregaFull = await Entrega.findById(entrega._id)
      .populate("colaboradorId", "nome matricula")
      .populate("entreguePor", "nome email")
      .populate("devolvidoPor", "nome email");

    res.json(entregaFull);

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(500).json({ error: "Erro ao registrar devolução" });
  }
});


export default router;
