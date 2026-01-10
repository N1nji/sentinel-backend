import { Router } from "express";
import Usuario from "../models/Usuario";
import Log from "../models/Log";
import { auth, AuthRequest } from "../middleware/auth";
import { isAdminMaster } from "../utils/isAdminMaster";

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

  const isMaster = isAdminMaster(req);

  // 🚨 Proteção entre admins
  if (!isMaster && usuario.tipo === "admin") {
    return res.status(403).json({
      erro: "Somente o administrador master pode bloquear outro administrador",
    });
  }

  usuario.status = "bloqueado";
  usuario.tokenVersion += 1; //  invalida sessões
  await usuario.save();

  await Log.create({
    usuarioId: usuario._id,
    acao: "USER_BLOCKED",
    detalhes: isMaster
      ? "Usuário bloqueado pelo administrador master"
      : "Usuário bloqueado por administrador",
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

  const isMaster = isAdminMaster(req);

  // 🚨 Proteção entre admins
  if (!isMaster && usuario.tipo === "admin") {
    return res.status(403).json({
      erro: "Somente o administrador master pode desbloquear outro administrador",
    });
  }

  usuario.status = "ativo";
  await usuario.save();

  await Log.create({
    usuarioId: usuario._id,
    acao: "USER_UNBLOCKED",
    detalhes: isMaster
      ? "Usuário desbloqueado pelo administrador master"
      : "Usuário desbloqueado por administrador",
    ip: req.ip,
  });

  res.json({ sucesso: true });
});

/* =====================================================
   🚪 LOGOUT REMOTO (ENCERRAR SESSÃO)
===================================================== */
router.post("/logout/:id", auth, async (req: AuthRequest, res) => {
  if (req.user?.tipo !== "admin") {
    return res.status(403).json({ erro: "Acesso restrito a administradores" });
  }

  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) {
    return res.status(404).json({ erro: "Usuário não encontrado" });
  }

  const isMaster = isAdminMaster(req);

  // 🚨 Proteção entre admins
  if (!isMaster && usuario.tipo === "admin") {
    return res.status(403).json({
      erro: "Somente o administrador master pode encerrar a sessão de outro administrador",
    });
  }

  usuario.tokenVersion += 1; // invalida TODOS os tokens
  await usuario.save();

  await Log.create({
    usuarioId: usuario._id,
    acao: "SESSION_TERMINATED",
    detalhes: isMaster
      ? "Sessão encerrada pelo administrador master"
      : "Sessão encerrada por administrador",
    ip: req.ip,
  });

  res.json({ sucesso: true });
});

export default router;
