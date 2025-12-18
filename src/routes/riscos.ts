// backend/src/routes/riscos.ts
import { Router } from "express";
import Risco from "../models/Risco";
import Setor from "../models/Setor";
import { auth } from "../middleware/auth";

const router = Router();

// LISTAR
router.get("/", auth, async (_, res) => {
  try {
    const riscos = await Risco.find().populate("setorId");
    res.json(riscos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar riscos" });
  }
});

// CRIAR
router.post("/", auth, async (req, res) => {
  try {
    const {
      nome,
      categoria,
      setorId,
      descricao,
      probabilidade,
      severidade,
      medidas,
      responsavel,
      status,
    } = req.body;

    const setor = await Setor.findById(setorId);
    if (!setor) return res.status(400).json({ error: "Setor inválido" });

    // Aqui o problema ocorria:
    // TS estava inferindo um array porque havia conflito com outro model.
    // Agora, com rota limpa, volta a funcionar.

    const risco = await Risco.create({
      nome,
      categoria,
      setorId,
      descricao,
      probabilidade,
      severidade,
      medidas,
      responsavel,
      status,
    });

    res.json(risco);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar risco" });
  }
});

// EDITAR
router.put("/:id", auth, async (req, res) => {
  try {
    const riscoAtualizado = await Risco.findOneAndUpdate(
      { _id: req.params.id },
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    ).populate("setorId");

    res.json(riscoAtualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar risco" });
  }
});

// DELETAR
router.delete("/:id", auth, async (req, res) => {
  try {
    await Risco.findByIdAndDelete(req.params.id);
    res.json({ msg: "Risco removido com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar risco" });
  }
});

export default router;
