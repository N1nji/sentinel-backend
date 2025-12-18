import { Router } from "express";
import Usuario from "../models/Usuario";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

// REGISTER (temporário para criar primeiro user)
router.post("/register", async (req, res) => {
  const { nome, email, senha } = req.body;

  const hash = await bcrypt.hash(senha, 10);

  const usuario = await Usuario.create({ nome, email, senha: hash });

  res.json(usuario);
});

// LOGIN
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

  res.json({ token, usuario });
});

export default router;
