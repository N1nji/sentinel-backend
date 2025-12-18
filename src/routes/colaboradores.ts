import { Router } from "express";
import Colaborador from "../models/Colaborador";
import Setor from "../models/Setor";
import { auth } from "../middleware/auth";

const router = Router();

// LISTAR TODOS
router.get("/", auth, async (_, res) => {
  const colaboradores = await Colaborador.find().populate("setorId");
  res.json(colaboradores);
});

// CRIAR
router.post("/", auth, async (req, res) => {
  const { nome, matricula, funcao, telefone, email, setorId } = req.body;

  const setor = await Setor.findById(setorId);
  if (!setor) return res.status(400).json({ error: "Setor inválido" });

  const colaborador = await Colaborador.create({
    nome,
    matricula,
    funcao,
    telefone,
    email,
    setorId,
  });

  res.json(colaborador);
});

// EDITAR
router.put("/:id", auth, async (req, res) => {
  const colaborador = await Colaborador.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  ).populate("setorId");

  res.json(colaborador);
});

// DELETAR (excluir de verdade)
router.delete("/:id", auth, async (req, res) => {
  await Colaborador.findByIdAndDelete(req.params.id);
  res.json({ msg: "Colaborador removido" });
});

export default router;
