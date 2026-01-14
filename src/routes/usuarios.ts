import { Router } from "express";
import Usuario from "../models/Usuario";
import bcrypt from "bcryptjs";
import { auth, AuthRequest } from "../middleware/auth";
import { onlyAdmin } from "../middleware/admin";

const router = Router();

// LISTAR TODOS
router.get("/", auth, onlyAdmin, async (req: AuthRequest, res) => {
  const usuarios = await Usuario.find().select("-senha").lean(); // remove

  const isAdminMaster = 
    req.user?.email === process.env.MASTER_ADMIN_EMAIL;

  res.json({
    usuarios,
    isAdminMaster,
  });
});

// CRIAR USUÁRIO
router.post("/", auth, onlyAdmin, async (req, res) => {
  const { nome, email, tipo } = req.body;

  // Gerar senha automática
  const senhaGerada = Math.random().toString(36).slice(-10);
  const senhaHash = await bcrypt.hash(senhaGerada, 10);

  const novo = await Usuario.create({
    nome,
    email,
    tipo,
    senha: senhaHash,
  });

  res.json({
    msg: "Usuário criado com sucesso!",
    usuario: { id: novo._id, nome, email, tipo },
    senhaGerada // Mostrar SOMENTE nesta resposta
  });
});

router.put("/:id", auth, async (req, res) => {
  const { nome, email, tipo } = req.body;

  const usuario = await Usuario.findByIdAndUpdate(
    req.params.id,
    { nome, email, tipo },
    { new: true }
  );

  res.json(usuario);
});

router.delete("/:id", auth, onlyAdmin, async (req: any, res) => {
  if (req.userId === req.params.id) {
    return res.status(400).json({ 
      error: "Você não pode deletar seu próprio usuário" 
    });
  }

  await Usuario.findByIdAndDelete(req.params.id);
  res.json({ msg: "Usuário removido" });
}); 

export default router;
