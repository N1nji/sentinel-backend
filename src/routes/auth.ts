import { Router } from "express";
import Usuario from "../models/Usuario";
import Log from "../models/Log"; // Importe o Log aqui
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { auth, AuthRequest } from "../middleware/auth"; // Importe o middleware

const router = Router();

/* ==========================
   ROTA: MEU PERFIL (NOVA!)
========================== */
router.get("/me", auth, async (req: AuthRequest, res) => {
  try {
    // Busca os dados do usuário logado (usando o ID do token)
    const usuario = await Usuario.findById(req.userId).select("-senha");
    
    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    // Busca os últimos 10 logs de atividade desse usuário
    const logsRecentes = await Log.find({ usuarioId: req.userId })
      .sort({ data: -1 })
      .limit(10);

    res.json({
      usuario,
      logs: logsRecentes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao carregar perfil" });
  }
});

// REGISTER
router.post("/register", async (req, res) => {
 
  const { nome, email, senha, tipo, cargo } = req.body;

  const existe = await Usuario.findOne({ email });
  if (existe) return res.status(400).json({ erro: "E-mail já cadastrado" });

  const hash = await bcrypt.hash(senha, 10);

  await Usuario.create({ 
    nome, 
    email, 
    senha: hash,
    tipo: tipo || "admin",
    cargo: cargo || "Técnico de Segurança" // Valor padrão caso não envie
  });

  res.json({ msg: "Usuário criado com sucesso" });
});


router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  const usuario = await Usuario.findOne({ email });
  if (!usuario) return res.status(400).json({ erro: "Usuário não encontrado" });

  const ok = await bcrypt.compare(senha, usuario.senha);
  if (!ok) return res.status(400).json({ erro: "Senha incorreta" });

  const token = jwt.sign(
    { id: usuario._id, tipo: usuario.tipo },
    process.env.JWT_SECRET!,
    { expiresIn: "1d" }
  );

  const { senha: _, ...usuarioSemSenha } = usuario.toObject();

  res.json({ token, usuario: usuarioSemSenha });
});

export default router;