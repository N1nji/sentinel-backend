import { Router } from "express";
import Usuario from "../models/Usuario";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

// REGISTER
router.post("/register", async (req, res) => {
  const { nome, email, senha, tipo } = req.body;

  const existe = await Usuario.findOne({ email });
  if (existe) return res.status(400).json({ erro: "E-mail já cadastrado" });

  const hash = await bcrypt.hash(senha, 10);

  await Usuario.create({ 
    nome, 
    email, 
    senha: hash,
    tipo: tipo || "user" 
  });

  res.json({ msg: "Usuário criado com sucesso" });
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  const usuario = await Usuario.findOne({ email });
  if (!usuario) return res.status(400).json({ erro: "Usuário não encontrado" });

  const ok = await bcrypt.compare(senha, usuario.senha);
  if (!ok) return res.status(400).json({ erro: "Senha incorreta" });

  const token = jwt.sign(
    { id: usuario._id, tipo: usuario.tipo }, // Aqui já está perfeito!
    process.env.JWT_SECRET!,
    { expiresIn: "1d" }
  );

  // Remove a senha antes de enviar para o frontend
  const { senha: _, ...usuarioSemSenha } = usuario.toObject();

  res.json({ token, usuario: usuarioSemSenha });
});

export default router;
