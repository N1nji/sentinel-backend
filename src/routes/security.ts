import { Router } from "express";
import SecurityLog from "../models/SecurityLog";
import { auth, AuthRequest } from "../middleware/auth";

const router = Router();

/* =====================================================
   🔐 MIDDLEWARE: SOMENTE ADMIN
===================================================== */
function adminOnly(req: AuthRequest, res: any, next: any) {
  if (req.user?.tipo !== "admin") {
    return res.status(403).json({ erro: "Acesso restrito a administradores" });
  }
  next();
}

/* =====================================================
   🕵️‍♂️ FUNÇÃO PARA MASCARAR IP
===================================================== */
function maskIp(ip?: string) {
  if (!ip) return "";
  // IPv4 → 192.168.0.xxx
  return ip.replace(/\.\d+$/, ".xxx");
}

/* =====================================================
   📜 LISTAR LOGS DE SEGURANÇA
   GET /security/logs
===================================================== */
router.get("/logs", auth, adminOnly, async (req: AuthRequest, res) => {
  try {
    const {
      page = "1",
      limit = "20",
      action,
      email,
      userId,
    } = req.query;

    const filtros: any = {};

    if (action) filtros.action = action;
    if (email) filtros.email = email;
    if (userId) filtros.userId = userId;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      SecurityLog.find(filtros)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("userId", "nome email tipo"),
      SecurityLog.countDocuments(filtros),
    ]);

    // VERIFICA SE É ADMIN MASTER
    const isMasterAdmin =
      req.user?.email === process.env.MASTER_ADMIN_EMAIL;

    // SANITIZA IP PARA OUTROS ADMINS
    const logsSanitizados = logs.map((log: any) => {
      const obj = log.toObject();
      return {
        ...obj,
        ip: isMasterAdmin ? obj.ip : maskIp(obj.ip),
      };
    });

    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      logs: logsSanitizados,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar logs de segurança" });
  }
});

export default router;
