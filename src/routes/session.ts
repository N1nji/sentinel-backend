import { Router } from "express";
import Usuario from "../models/Usuario";
import Log from "../models/Log";
import { auth, AuthRequest } from "../middleware/auth";

const router = Router();

/* =====================================================
   🔒 BLOQUEAR USUÁRIO + ENCERRAR SESSÃO
===================================================== */
router.post("/usuarios/:id/bloquear", auth, async (req: AuthRequest, res) => {
  if (req.user?.tipo !== "admin") {
    return res.status(403).json({ erro: "Acesso negado" });
  }

  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  usuario.status = "bloqueado";
  usuario.tokenVersion += 1; // 🔥 invalida tokens
  await usuario.save();

  await Log.create({
    usuarioId: usuario._id,
    acao: "USER_BLOCKED",
    detalhes: "Usuário bloqueado e sessão encerrada por administrador",
    ip: req.ip,
  });

  res.json({ sucesso: true });
});

/* =====================================================
   🔓 DESBLOQUEAR USUÁRIO
===================================================== */
router.post("/usuarios/:id/desbloquear", auth, async (req: AuthRequest, res) => {
  if (req.user?.tipo !== "admin") {
    return res.status(403).json({ erro: "Acesso negado" });
  }

  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  usuario.status = "ativo";
  await usuario.save();

  await Log.create({
    usuarioId: usuario._id,
    acao: "USER_UNBLOCKED",
    detalhes: "Usuário desbloqueado por administrador",
    ip: req.ip,
  });

  res.json({ sucesso: true });
});

/* =====================================================
   🚪 LOGOUT REMOTO (ENCERRAR SESSÃO)
   POST /sessions/logout/:id
===================================================== */
router.post("/logout/:id", auth, async (req: AuthRequest, res) => {
  if (req.user?.tipo !== "admin") {
    return res.status(403).json({ erro: "Acesso restrito a administradores" });
  }

  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  usuario.tokenVersion += 1; // 🔥 invalida TODOS os tokens
  await usuario.save();

  await Log.create({
    usuarioId: usuario._id,
    acao: "SESSION_TERMINATED",
    detalhes: "Sessão encerrada remotamente por administrador",
    ip: req.ip,
  });

  res.json({ sucesso: true });
});

export default router;
