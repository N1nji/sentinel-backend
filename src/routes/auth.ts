import { Router } from "express";
import Usuario from "../models/Usuario";
import Log from "../models/Log"; // 🔒 LOG DE AÇÕES DO SISTEMA (NÃO REMOVER)
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { auth, AuthRequest } from "../middleware/auth";
import { logSecurityEvent } from "../utils/logSecurityEvent";

const router = Router();

/* ==========================
   ROTA: MEU PERFIL
========================== */
router.get("/me", auth, async (req: AuthRequest, res) => {
  try {
    const usuario = await Usuario.findById(req.userId).select("-senha");

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    // Logs funcionais (ações do sistema) — mantém como estava
    const logsRecentes = await Log.find({ usuarioId: req.userId })
      .sort({ data: -1 })
      .limit(10);

    res.json({
      usuario,
      logs: logsRecentes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao carregar perfil" });
  }
});

/* ==========================
   REGISTER
========================== */
router.post("/register", async (req, res) => {
  const { nome, email, senha, tipo, cargo } = req.body;

  try {
    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(400).json({ erro: "E-mail já cadastrado" });
    }

    const hash = await bcrypt.hash(senha, 10);

    await Usuario.create({
      nome,
      email,
      senha: hash,
      tipo: tipo || "admin",
      cargo: cargo || "Técnico de Segurança",
      status: "ativo",
    });

    res.json({ msg: "Usuário criado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao registrar usuário" });
  }
});

/* ==========================
   LOGIN (COM SECURITY LOG)
========================== */
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const usuario = await Usuario.findOne({ email });

    // ❌ Usuário não encontrado
    if (!usuario) {
      await logSecurityEvent({
        action: "LOGIN_FAILED",
        email,
        req,
        details: "Usuário não encontrado",
      });

      return res.status(400).json({ erro: "Usuário não encontrado" });
    }

    // ❌ Usuário bloqueado
    if (usuario.status !== "ativo") {
      await logSecurityEvent({
        action: "ACCESS_DENIED",
        userId: usuario._id.toString(),
        email: usuario.email,
        req,
        details: "Usuário com status inativo",
      });

      return res.status(403).json({
        erro: "Acesso bloqueado. Entre em contato com o administrador.",
      });
    }

    // ❌ Senha incorreta
    const senhaOk = await bcrypt.compare(senha, usuario.senha);
    if (!senhaOk) {
      await logSecurityEvent({
        action: "LOGIN_FAILED",
        userId: usuario._id.toString(),
        email: usuario.email,
        req,
        details: "Senha incorreta",
      });

      return res.status(400).json({ erro: "Senha incorreta" });
    }

    // ✅ Login sucesso
    const token = jwt.sign(
      {
        id: usuario._id,
        tipo: usuario.tipo,
        email: usuario.email,
        tokenVersion: usuario.tokenVersion,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    await logSecurityEvent({
      action: "LOGIN_SUCCESS",
      userId: usuario._id.toString(),
      email: usuario.email,
      req,
    });

    const { senha: _, ...usuarioSemSenha } = usuario.toObject();

    res.json({
      token,
      usuario: usuarioSemSenha,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro interno no login" });
  }
});

export default router;
