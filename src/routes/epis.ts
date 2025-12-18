import { Router } from "express";
import Epi from "../models/Epi";
import { auth } from "../middleware/auth";

const router = Router();

// LISTAR
router.get("/", auth, async (_, res) => {
  try {
    const epis = await Epi.find();
    res.json(epis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar EPIs" });
  }
});

// CRIAR
router.post("/", auth, async (req, res) => {
  try {
    const epi = await Epi.create(req.body);
    res.json(epi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar EPI" });
  }
});

// EDITAR
router.put("/:id", auth, async (req, res) => {
  try {
    const epiAtualizado = await Epi.findOneAndUpdate(
      { _id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json(epiAtualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar EPI" });
  }
});

// DELETAR
router.delete("/:id", auth, async (req, res) => {
  try {
    await Epi.findByIdAndDelete(req.params.id);
    res.json({ msg: "EPI removido com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar EPI" });
  }
});

export default router;
